import supabase from './supabase'

export async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabase
      .from('quizzes')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return { success: false, error }
    }
    
    console.log('Database connection successful:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Database connection failed:', err)
    return { success: false, error: err }
  }
}

export async function testQuizCreation() {
  try {
    console.log('Testing quiz creation...')
    
    // Test creating a quiz
    const { data, error } = await supabase
      .from('quizzes')
      .insert([
        {
          title: 'Test Quiz',
          description: 'This is a test quiz',
          user_id: 'test-user-id'
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Quiz creation test error:', error)
      return { success: false, error }
    }
    
    console.log('Quiz creation test successful:', data)
    
    // Clean up test data
    await supabase
      .from('quizzes')
      .delete()
      .eq('id', data.id)
    
    return { success: true, data }
  } catch (err) {
    console.error('Quiz creation test failed:', err)
    return { success: false, error: err }
  }
}
