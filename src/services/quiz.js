import supabase from '../utils/supabase'

export class QuizService {
  // Create a new quiz
  static async createQuiz(title, description, userId) {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([
        {
          title,
          description,
          user_id: userId
        }
      ])
      .select()
      .single()
    
    return { data, error }
  }

  // Get all quizzes for a user
  static async getUserQuizzes(userId) {
    console.log('QuizService.getUserQuizzes called with userId:', userId)
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    console.log('QuizService.getUserQuizzes result:', { data, error })
    
    return { data, error }
  }

  // Get a specific quiz with questions and answers
  static async getQuizWithQuestions(quizId) {
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (quizError) return { data: null, error: quizError }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        answers (*)
      `)
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    if (questionsError) return { data: null, error: questionsError }

    return { 
      data: { ...quiz, questions }, 
      error: null 
    }
  }

  // Create a question
  static async createQuestion(quizId, text, imageUrl = null, timeLimit = 30, questionType = 'MCQ', orderIndex = 0) {
    const { data, error } = await supabase
      .from('questions')
      .insert([
        {
          quiz_id: quizId,
          text,
          image_url: imageUrl,
          time_limit: timeLimit,
          question_type: questionType,
          order_index: orderIndex
        }
      ])
      .select()
      .single()
    
    return { data, error }
  }

  // Create answers for a question
  static async createAnswers(questionId, answers) {
    const answersData = answers.map(answer => ({
      question_id: questionId,
      text: answer.text,
      is_correct: answer.is_correct
    }))

    const { data, error } = await supabase
      .from('answers')
      .insert(answersData)
      .select()
    
    return { data, error }
  }

  // Update a quiz
  static async updateQuiz(quizId, updates) {
    const { data, error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single()
    
    return { data, error }
  }

  // Delete a quiz
  static async deleteQuiz(quizId) {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)
    
    return { error }
  }

  // Upload image to Supabase Storage
  static async uploadImage(file, quizId, questionId) {
    const fileExt = file.name.split('.').pop()
    const fileName = `quiz_${quizId}/question_${questionId}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from('quiz-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) return { data: null, error }

    const { data: { publicUrl } } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(data.path)

    return { data: publicUrl, error: null }
  }
}
