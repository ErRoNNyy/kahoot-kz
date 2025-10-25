-- Quick fix for Guest Users to Access Questions and Answers
-- Run this in your Supabase SQL Editor

-- =============================================
-- STEP 1: FIX QUESTIONS TABLE ACCESS
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view questions for their quizzes" ON questions;
DROP POLICY IF EXISTS "Users can view all questions" ON questions;
DROP POLICY IF EXISTS "Allow question access for session participants" ON questions;

-- Create simple policy that allows everyone to read questions
CREATE POLICY "Allow all question access" ON questions
    FOR SELECT USING (true);

-- =============================================
-- STEP 2: FIX ANSWERS TABLE ACCESS  
-- =============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view answers for their questions" ON answers;
DROP POLICY IF EXISTS "Users can view all answers" ON answers;
DROP POLICY IF EXISTS "Allow answer access for session participants" ON answers;

-- Create simple policy that allows everyone to read answers
CREATE POLICY "Allow all answer access" ON answers
    FOR SELECT USING (true);

-- =============================================
-- STEP 3: VERIFY QUIZ ACCESS STILL WORKS
-- =============================================

-- Drop and recreate quiz policy to be more permissive
DROP POLICY IF EXISTS "Users can view their own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can view all quizzes" ON quizzes;
DROP POLICY IF EXISTS "Allow quiz access for session participants" ON quizzes;

-- Create simple policy that allows everyone to read quizzes
CREATE POLICY "Allow all quiz access" ON quizzes
    FOR SELECT USING (true);

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'Guest questions and answers access fixed!' as status;
