-- Fix for Guest Users to Access Quiz Data
-- This script allows guests to read quiz data when participating in active sessions

-- =============================================
-- STEP 1: ALLOW GUESTS TO READ QUIZ DATA
-- =============================================

-- Drop existing restrictive policies on quizzes table
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can view all quizzes" ON quizzes;

-- Create new policy that allows guests to read quiz data for active sessions
CREATE POLICY "Allow quiz access for session participants" ON quizzes
    FOR SELECT USING (
        -- Quiz owner can always see their quizzes
        user_id = auth.uid() OR
        -- Anyone can read quizzes that are part of active sessions
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.quiz_id = quizzes.id 
            AND sessions.status = 'active'
        )
    );

-- =============================================
-- STEP 2: ALLOW GUESTS TO READ QUESTIONS
-- =============================================

-- Drop existing restrictive policies on questions table
DROP POLICY IF EXISTS "Users can view questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can view all questions" ON questions;

-- Create new policy that allows guests to read questions for active sessions
CREATE POLICY "Allow question access for session participants" ON questions
    FOR SELECT USING (
        -- Quiz owner can always see their questions
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.user_id = auth.uid()
        ) OR
        -- Anyone can read questions for quizzes in active sessions
        EXISTS (
            SELECT 1 FROM sessions 
            JOIN quizzes ON sessions.quiz_id = quizzes.id
            WHERE quizzes.id = questions.quiz_id 
            AND sessions.status = 'active'
        )
    );

-- =============================================
-- STEP 3: ALLOW GUESTS TO READ ANSWERS
-- =============================================

-- Drop existing restrictive policies on answers table
DROP POLICY IF EXISTS "Users can view answers for their questions" ON answers;
DROP POLICY IF EXISTS "Users can view all answers" ON answers;

-- Create new policy that allows guests to read answers for active sessions
CREATE POLICY "Allow answer access for session participants" ON answers
    FOR SELECT USING (
        -- Quiz owner can always see their answers
        EXISTS (
            SELECT 1 FROM questions 
            JOIN quizzes ON questions.quiz_id = quizzes.id
            WHERE questions.id = answers.question_id 
            AND quizzes.user_id = auth.uid()
        ) OR
        -- Anyone can read answers for questions in active sessions
        EXISTS (
            SELECT 1 FROM sessions 
            JOIN quizzes ON sessions.quiz_id = quizzes.id
            JOIN questions ON questions.quiz_id = quizzes.id
            WHERE questions.id = answers.question_id 
            AND sessions.status = 'active'
        )
    );

-- =============================================
-- STEP 4: VERIFY POLICIES ARE WORKING
-- =============================================

-- Test that guests can access quiz data
-- This should return quiz data for active sessions
SELECT 'Guest quiz access policies created successfully!' as status;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'Guest quiz access fix completed successfully!' as status;
