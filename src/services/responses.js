import supabase from '../utils/supabase'

export class ResponsesService {
  // Submit a response for a participant
  static async submitResponse(sessionId, participantId, questionId, answerId, isCorrect, answerText = null) {
    console.log('ResponsesService.submitResponse called with:', {
      sessionId,
      participantId,
      questionId,
      answerId,
      isCorrect,
      answerText
    })

    try {
      // First, check if this participant has already answered this question
      const { data: existingResponse, error: checkError } = await supabase
        .from('responses')
        .select('id')
        .eq('session_id', sessionId)
        .eq('participant_id', participantId)
        .eq('question_id', questionId)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing response:', checkError)
        return { data: null, error: checkError }
      }

      if (existingResponse) {
        console.log('Participant already answered this question, updating response')
        // Update existing response
        const { data, error } = await supabase
          .from('responses')
          .update({
            answer_id: answerId,
            is_correct: isCorrect,
            answer_text: answerText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingResponse.id)
          .select()
          .single()

        console.log('ResponsesService.submitResponse update result:', { data, error })
        return { data, error }
      } else {
        console.log('Creating new response')
        // Create new response
        const responseData = {
          session_id: sessionId,
          participant_id: participantId,
          question_id: questionId,
          answer_id: answerId,
          is_correct: isCorrect
        }

        // Note: answer_text column doesn't exist in database schema
        // For short answer questions, we'll store the text in the answer_id field or handle differently
        if (answerText) {
          console.log('Short answer text (not stored in database):', answerText)
        }

        const { data, error } = await supabase
          .from('responses')
          .insert([responseData])
          .select()
          .single()

        console.log('ResponsesService.submitResponse create result:', { data, error })
        
        if (data) {
          console.log('✅ Response successfully created in database - real-time update should trigger')
        } else if (error) {
          console.error('❌ Failed to create response:', error)
        }
        
        return { data, error }
      }
    } catch (err) {
      console.error('Error in submitResponse:', err)
      return { data: null, error: err }
    }
  }

  // Get all responses for a specific question
  static async getQuestionResponses(sessionId, questionId) {
    console.log('ResponsesService.getQuestionResponses called with:', { sessionId, questionId })

    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          session_participants (
            id,
            nickname,
            score,
            guest_id,
            user_id
          )
        `)
        .eq('session_id', sessionId)
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })

      console.log('ResponsesService.getQuestionResponses result:', { 
        data, 
        error, 
        count: data?.length || 0 
      })

      if (data && data.length > 0) {
        console.log('Response details:', data.map(r => ({
          responseId: r.id,
          participantId: r.participant_id,
          sessionParticipantId: r.session_participants?.id,
          nickname: r.session_participants?.nickname,
          answerId: r.answer_id,
          isCorrect: r.is_correct,
          hasParticipantData: !!r.session_participants
        })))
      }

      return { data, error }
    } catch (err) {
      console.error('Error in getQuestionResponses:', err)
      return { data: null, error: err }
    }
  }

  // Get all responses for a session
  static async getSessionResponses(sessionId) {
    console.log('ResponsesService.getSessionResponses called with:', { sessionId })

    try {
      const { data, error } = await supabase
        .from('responses')
        .select(`
          *,
          session_participants (
            id,
            nickname,
            score,
            guest_id,
            user_id
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      console.log('ResponsesService.getSessionResponses result:', { 
        data, 
        error, 
        count: data?.length || 0 
      })

      return { data, error }
    } catch (err) {
      console.error('Error in getSessionResponses:', err)
      return { data: null, error: err }
    }
  }

  // Update participant score when they get a correct answer
  static async updateParticipantScore(sessionId, participantId, points = 1) {
    console.log('ResponsesService.updateParticipantScore called with:', { sessionId, participantId, points })

    try {
      // Get current score
      const { data: participant, error: fetchError } = await supabase
        .from('session_participants')
        .select('score, nickname, guest_id, user_id')
        .eq('session_id', sessionId)
        .eq('id', participantId)
        .single()

      if (fetchError) {
        console.error('Error fetching participant for score update:', fetchError)
        return { error: fetchError }
      }

      const newScore = (participant.score || 0) + points
      console.log('Updating participant score from', participant.score, 'to', newScore)

      // Update score
      const { error } = await supabase
        .from('session_participants')
        .update({ score: newScore })
        .eq('session_id', sessionId)
        .eq('id', participantId)

      console.log('ResponsesService.updateParticipantScore result:', { error })

      return { error }
    } catch (err) {
      console.error('Error in updateParticipantScore:', err)
      return { error: err }
    }
  }

  // Subscribe to response changes for real-time updates
  static subscribeToResponses(sessionId, callback) {
    console.log('ResponsesService.subscribeToResponses called with sessionId:', sessionId)

    const subscription = supabase
      .channel(`responses-${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'responses',
          filter: `session_id=eq.${sessionId}`
        }, 
        (payload) => {
          console.log('🔔 ResponsesService received response update:', payload)
          console.log('📊 Response event type:', payload.eventType)
          console.log('📝 Response data:', payload.new || payload.old)
          console.log('🎯 Session ID in payload:', payload.new?.session_id || payload.old?.session_id)
          console.log('❓ Question ID in payload:', payload.new?.question_id || payload.old?.question_id)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('🔗 ResponsesService subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ ResponsesService: Successfully subscribed to real-time updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ ResponsesService: Channel error - real-time updates may not work')
        } else if (status === 'TIMED_OUT') {
          console.error('❌ ResponsesService: Subscription timed out')
        }
      })

    return subscription
  }

  // Subscribe to responses for a specific question
  static subscribeToQuestionResponses(sessionId, questionId, callback) {
    console.log('ResponsesService.subscribeToQuestionResponses called with:', { sessionId, questionId })

    const subscription = supabase
      .channel(`question-responses-${sessionId}-${questionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'responses',
          filter: `session_id=eq.${sessionId} AND question_id=eq.${questionId}`
        }, 
        (payload) => {
          console.log('ResponsesService received question response update:', payload)
          console.log('Question response event type:', payload.eventType)
          console.log('Question response data:', payload.new || payload.old)
          callback(payload)
        }
      )
      .subscribe((status) => {
        console.log('ResponsesService question subscription status:', status)
      })

    return subscription
  }

  // Delete all responses for a session (cleanup)
  static async deleteSessionResponses(sessionId) {
    console.log('ResponsesService.deleteSessionResponses called with:', { sessionId })

    try {
      const { error } = await supabase
        .from('responses')
        .delete()
        .eq('session_id', sessionId)

      console.log('ResponsesService.deleteSessionResponses result:', { error })
      return { error }
    } catch (err) {
      console.error('Error in deleteSessionResponses:', err)
      return { error: err }
    }
  }

  // Get response statistics for a question
  static async getQuestionStats(sessionId, questionId) {
    console.log('ResponsesService.getQuestionStats called with:', { sessionId, questionId })

    try {
      const { data, error } = await supabase
        .from('responses')
        .select('is_correct, answer_id, answer_text')
        .eq('session_id', sessionId)
        .eq('question_id', questionId)

      if (error) {
        console.error('Error getting question stats:', error)
        return { data: null, error }
      }

      const stats = {
        totalResponses: data?.length || 0,
        correctResponses: data?.filter(r => r.is_correct).length || 0,
        incorrectResponses: data?.filter(r => !r.is_correct).length || 0,
        accuracy: data?.length > 0 ? (data.filter(r => r.is_correct).length / data.length) * 100 : 0
      }

      console.log('ResponsesService.getQuestionStats result:', stats)
      return { data: stats, error: null }
    } catch (err) {
      console.error('Error in getQuestionStats:', err)
      return { data: null, error: err }
    }
  }
}
