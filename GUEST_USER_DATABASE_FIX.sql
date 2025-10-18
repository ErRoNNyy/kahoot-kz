-- Fix for Guest Users in Database
-- This script updates the database to properly handle guest users

-- =============================================
-- STEP 1: UPDATE SESSION_PARTICIPANTS TABLE
-- =============================================

-- Make user_id nullable to allow guest users
ALTER TABLE session_participants 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a guest_id field for guest users
ALTER TABLE session_participants 
ADD COLUMN guest_id TEXT;

-- Create index for guest_id
CREATE INDEX idx_session_participants_guest_id ON session_participants(guest_id);

-- =============================================
-- STEP 2: UPDATE RLS POLICIES FOR GUEST USERS
-- =============================================

-- Drop existing policies that don't work with guests
DROP POLICY IF EXISTS "Participants can manage participation" ON session_participants;
DROP POLICY IF EXISTS "Participants can submit responses" ON responses;

-- Create new policies that work with both authenticated users and guests
CREATE POLICY "Participants can manage participation" ON session_participants
    FOR ALL USING (
        -- Authenticated users can manage their own participation
        (user_id IS NOT NULL AND user_id = auth.uid()) OR 
        -- Host can manage all participants in their sessions
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_participants.session_id 
            AND sessions.host_id = auth.uid()
        ) OR
        -- Guest users can manage their own participation (no auth check)
        (user_id IS NULL AND guest_id IS NOT NULL)
    );

-- Allow anyone to read session participants for active sessions
CREATE POLICY "Anyone can read participants for active sessions" ON session_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = session_participants.session_id 
            AND sessions.status = 'active'
        )
    );

-- Allow participants to submit responses (both authenticated and guest)
CREATE POLICY "Participants can submit responses" ON responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM session_participants 
            WHERE session_participants.id = responses.participant_id
            AND (
                -- Authenticated user
                (session_participants.user_id IS NOT NULL AND session_participants.user_id = auth.uid()) OR
                -- Guest user (no auth check needed)
                (session_participants.user_id IS NULL AND session_participants.guest_id IS NOT NULL)
            )
        )
    );

-- =============================================
-- STEP 3: UPDATE SESSION SERVICE
-- =============================================

-- The SessionService.joinSession method needs to be updated to handle guest users
-- This will be done in the JavaScript code, not SQL

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'Guest user database fix completed successfully!' as status;
