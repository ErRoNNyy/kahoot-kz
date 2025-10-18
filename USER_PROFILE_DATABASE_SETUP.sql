-- User Profile Database Setup
-- This script sets up the database schema for user profiles with avatars

-- =============================================
-- STEP 1: CREATE AVATARS STORAGE BUCKET
-- =============================================

-- Create avatars storage bucket (run this in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- =============================================
-- STEP 2: UPDATE USERS TABLE
-- =============================================

-- Add profile fields to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for nickname searches
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);

-- =============================================
-- STEP 3: CREATE PROFILE UPDATE TRIGGER
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- STEP 4: UPDATE RLS POLICIES
-- =============================================

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow public read access to basic profile info (for leaderboards, etc.)
CREATE POLICY "Public can read basic profile info" ON users
    FOR SELECT USING (true);

-- =============================================
-- STEP 5: CREATE STORAGE POLICIES
-- =============================================

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- =============================================
-- STEP 6: CREATE PROFILE FUNCTIONS
-- =============================================

-- Function to get user profile with avatar
CREATE OR REPLACE FUNCTION get_user_profile(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    username TEXT,
    nickname TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.nickname,
        u.avatar_url,
        u.bio,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
    user_uuid UUID,
    new_username TEXT DEFAULT NULL,
    new_nickname TEXT DEFAULT NULL,
    new_avatar_url TEXT DEFAULT NULL,
    new_bio TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user is updating their own profile
    IF user_uuid != auth.uid() THEN
        RETURN FALSE;
    END IF;
    
    -- Update profile fields
    UPDATE users SET
        username = COALESCE(new_username, username),
        nickname = COALESCE(new_nickname, nickname),
        avatar_url = COALESCE(new_avatar_url, avatar_url),
        bio = COALESCE(new_bio, bio),
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 7: SAMPLE DATA (OPTIONAL)
-- =============================================

-- Update existing users with default values if needed
-- UPDATE users 
-- SET nickname = COALESCE(nickname, username),
--     avatar_url = COALESCE(avatar_url, 'https://via.placeholder.com/150/8B5CF6/FFFFFF?text=👤')
-- WHERE nickname IS NULL OR avatar_url IS NULL;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if all columns exist
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- AND column_name IN ('nickname', 'avatar_url', 'bio', 'updated_at');

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'users';

-- Check storage policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage';
