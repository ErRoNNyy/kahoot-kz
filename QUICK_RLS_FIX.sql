-- Quick fix to remove all RLS restrictions for quiz data
-- Run this in your Supabase SQL Editor

-- Disable RLS on quizzes table
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;

-- Disable RLS on questions table  
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on answers table
ALTER TABLE answers DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS but with permissive policies
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies that allow everyone to read
CREATE POLICY "Allow all quiz access" ON quizzes FOR SELECT USING (true);
CREATE POLICY "Allow all question access" ON questions FOR SELECT USING (true);
CREATE POLICY "Allow all answer access" ON answers FOR SELECT USING (true);

SELECT 'RLS restrictions removed - guests can now access quiz data!' as status;
