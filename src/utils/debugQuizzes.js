import supabase from './supabase'

export async function debugUserQuizzes(userId) {
  try {
    console.log('🔍 Debugging quizzes for user:', userId)
    
    // Get all quizzes (without user filter)
    const { data: allQuizzes, error: allError } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('📊 All quizzes in database:', allQuizzes)
    
    if (allError) {
      console.error('❌ Error fetching all quizzes:', allError)
      return { success: false, error: allError }
    }
    
    // Get quizzes for specific user
    const { data: userQuizzes, error: userError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log('👤 Quizzes for user', userId, ':', userQuizzes)
    
    if (userError) {
      console.error('❌ Error fetching user quizzes:', userError)
      return { success: false, error: userError }
    }
    
    // Check for ID mismatches
    const userIds = [...new Set(allQuizzes.map(q => q.user_id))]
    console.log('🆔 All user IDs in database:', userIds)
    console.log('🎯 Looking for user ID:', userId)
    console.log('✅ User ID found in database:', userIds.includes(userId))
    
    return {
      success: true,
      allQuizzes,
      userQuizzes,
      allUserIds: userIds,
      userFound: userIds.includes(userId)
    }
  } catch (err) {
    console.error('❌ Debug failed:', err)
    return { success: false, error: err }
  }
}
