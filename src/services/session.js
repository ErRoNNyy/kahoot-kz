import supabase from '../utils/supabase'
import { ResponsesService } from './responses.js'

export class SessionService {
  // Create a new session
  static async createSession(quizId, hostId) {
    console.log('SessionService.createSession called with:', { quizId, hostId })
    const sessionCode = this.generateSessionCode()
    console.log('Generated session code:', sessionCode)
    
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          quiz_id: quizId,
          host_id: hostId,
          code: sessionCode,
          status: 'active'
        }
      ])
      .select()
      .single()
    
    console.log('Session creation result:', { data, error })
    
    return { data, error }
  }

  // Join a session
  static async joinSession(sessionCode, participantId, nickname) {
    console.log('SessionService.joinSession called with:', { sessionCode, participantId, nickname })
    
    // First, get the session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', sessionCode)
      .eq('status', 'active')
      .single()

    console.log('Session lookup result:', { session, sessionError })

    if (sessionError) {
      console.error('Session lookup error:', sessionError)
      return { data: null, error: sessionError }
    }

    if (!session) {
      console.error('Session not found for code:', sessionCode)
      return { data: null, error: { message: 'Session not found or not active' } }
    }

    // Check if this is a guest user (starts with 'guest_' or is a UUID)
    const isGuest = participantId.startsWith('guest_') || participantId.includes('-')
    
    console.log('Adding participant to session:', session.id, 'isGuest:', isGuest)
    
    // Prepare participant data based on user type
    const participantData = {
      session_id: session.id,
      nickname,
      score: 0,
      is_active: true,
      left_at: null
    }
    
    if (isGuest) {
      // For guest users, use guest_id instead of user_id
      participantData.guest_id = participantId
      participantData.user_id = null
    } else {
      // For authenticated users, use user_id
      participantData.user_id = participantId
      participantData.guest_id = null
    }
    
    const { data, error } = await supabase
      .from('session_participants')
      .insert([participantData])
      .select()
      .single()
    
    console.log('Participant creation result:', { data, error })
    
    return { data: { session, participant: data }, error }
  }

  // Allow a participant to leave a session
  static async leaveSession(sessionId, participantId) {
    console.log('SessionService.leaveSession called with:', { sessionId, participantId })

    if (!sessionId || !participantId) {
      const error = { message: 'Missing session or participant information' }
      console.error('SessionService.leaveSession validation error:', error)
      return { error }
    }

    try {
      const updates = {
        is_active: false,
        left_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('session_participants')
        .update(updates)
        .eq('session_id', sessionId)
        .eq('id', participantId)

      if (error) {
        console.error('SessionService.leaveSession failed to remove participant:', error)
        return { error }
      }

      console.log('SessionService.leaveSession completed successfully')
      return { error: null }
    } catch (err) {
      console.error('SessionService.leaveSession encountered an exception:', err)
      return { error: err }
    }
  }

  // Get session details
  static async getSession(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        quizzes (*),
        session_participants (*)
      `)
      .eq('id', sessionId)
      .single()
    
    return { data, error }
  }

  // Update current question
  static async updateCurrentQuestion(sessionId, questionId) {
    console.log('SessionService.updateCurrentQuestion called with:', { sessionId, questionId })
    
    const { data, error } = await supabase
      .from('sessions')
      .update({ current_question: questionId })
      .eq('id', sessionId)
      .select()
      .single()
    
    console.log('SessionService.updateCurrentQuestion result:', { data, error })
    
    if (error) {
      console.error('Error updating current question:', error)
    } else {
      console.log('Successfully updated session current_question to:', questionId)
    }
    
    return { data, error }
  }

  // Submit answer
  static async submitAnswer(sessionId, participantId, questionId, answerId, isCorrect, answerText = null) {
    console.log('SessionService.submitAnswer called with:', {
      sessionId,
      participantId,
      questionId,
      answerId,
      isCorrect,
      answerText
    })
    
    // Use the new ResponsesService
    const { data, error } = await ResponsesService.submitResponse(
      sessionId,
      participantId,
      questionId,
      answerId,
      isCorrect,
      answerText
    )
    
    console.log('SessionService.submitAnswer result:', { data, error })
    
    if (error) {
      console.error('Error submitting answer:', error)
      return { data, error }
    }

    // Update participant score
    if (isCorrect) {
      console.log('Updating participant score for correct answer')
      await ResponsesService.updateParticipantScore(sessionId, participantId)
    }

    return { data, error }
  }

  // Update participant score
  static async updateParticipantScore(sessionId, participantId) {
    console.log('SessionService.updateParticipantScore called with:', { sessionId, participantId })
    
    const { data: participant, error: fetchError } = await supabase
      .from('session_participants')
      .select('score, nickname, guest_id, user_id')
      .eq('session_id', sessionId)
      .eq('id', participantId)
      .single()

    console.log('SessionService.updateParticipantScore fetch result:', { participant, fetchError })

    if (fetchError) {
      console.error('Error fetching participant for score update:', fetchError)
      return { error: fetchError }
    }

    const newScore = participant.score + 1
    console.log('Updating participant score from', participant.score, 'to', newScore)

    const { error } = await supabase
      .from('session_participants')
      .update({ score: newScore })
      .eq('session_id', sessionId)
      .eq('id', participantId)

    console.log('SessionService.updateParticipantScore update result:', { error })

    return { error }
  }

  // Get leaderboard
  static async getLeaderboard(sessionId) {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('score', { ascending: false })
    
    return { data, error }
  }

  // End session
  static async endSession(sessionId) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)
      .select()
      .single()
    
    return { data, error }
  }

  // Subscribe to session updates
  static subscribeToSession(sessionId, callback) {
    return supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'sessions',
          filter: `id=eq.${sessionId}`
        }, 
        callback
      )
      .subscribe()
  }

  // Subscribe to responses for leaderboard
  static subscribeToResponses(sessionId, callback) {
    return supabase
      .channel(`responses-${sessionId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'responses',
          filter: `session_id=eq.${sessionId}`
        }, 
        callback
      )
      .subscribe()
  }

  // Subscribe to session participants
  static subscribeToParticipants(sessionId, callback) {
    return supabase
      .channel(`participants-${sessionId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        }, 
        callback
      )
      .subscribe()
  }

  // Generate unique session code
  static generateSessionCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Clean up guest user data from all sessions
  static async cleanupGuestUser(guestId) {
    try {
      console.log('SessionService: Cleaning up guest user:', guestId)
      
      // Remove guest from all session participants
      const { error: participantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('guest_id', guestId)
      
      if (participantsError) {
        console.error('Error removing guest from participants:', participantsError)
        return { error: participantsError }
      }
      
      // Remove guest responses
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .eq('participant_id', guestId)
      
      if (responsesError) {
        console.error('Error removing guest responses:', responsesError)
        return { error: responsesError }
      }
      
      console.log('Guest user cleanup completed successfully')
      return { error: null }
    } catch (err) {
      console.error('Error during guest user cleanup:', err)
      return { error: err }
    }
  }

  // Clean up all orphaned guest data (for maintenance)
  static async cleanupOrphanedGuests() {
    try {
      console.log('SessionService: Cleaning up orphaned guest data')
      
      // Find all guest participants that might be orphaned
      const { data: orphanedParticipants, error: fetchError } = await supabase
        .from('session_participants')
        .select('id, guest_id, session_id')
        .not('guest_id', 'is', null)
        .is('user_id', null)
      
      if (fetchError) {
        console.error('Error fetching orphaned participants:', fetchError)
        return { error: fetchError }
      }
      
      if (!orphanedParticipants || orphanedParticipants.length === 0) {
        console.log('No orphaned guest data found')
        return { error: null }
      }
      
      console.log(`Found ${orphanedParticipants.length} orphaned guest participants`)
      
      // Remove orphaned participants and their responses
      for (const participant of orphanedParticipants) {
        // Remove responses for this participant
        await supabase
          .from('responses')
          .delete()
          .eq('participant_id', participant.id)
        
        // Remove the participant
        await supabase
          .from('session_participants')
          .delete()
          .eq('id', participant.id)
      }
      
      console.log('Orphaned guest data cleanup completed')
      return { error: null }
    } catch (err) {
      console.error('Error during orphaned guest cleanup:', err)
      return { error: err }
    }
  }

  // Clean up a specific session (when host navigates away)
  static async cleanupSession(sessionId) {
    try {
      console.log('SessionService: Cleaning up session:', sessionId)
      
      // Remove all participants from this session first
      const { error: participantsError } = await supabase
        .from('session_participants')
        .delete()
        .eq('session_id', sessionId)
      
      if (participantsError) {
        console.error('Error removing participants:', participantsError)
        return { error: participantsError }
      }
      
      // Remove all responses for this session
      const { error: responsesError } = await supabase
        .from('responses')
        .delete()
        .eq('session_id', sessionId)
      
      if (responsesError) {
        console.error('Error removing responses:', responsesError)
        return { error: responsesError }
      }
      
      // Finally, delete the session itself
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
      
      if (sessionError) {
        console.error('Error deleting session:', sessionError)
        return { error: sessionError }
      }
      
      console.log('Session cleanup completed successfully - session deleted')
      return { error: null }
    } catch (err) {
      console.error('Error during session cleanup:', err)
      return { error: err }
    }
  }

  // Clean up abandoned sessions (sessions that are active but no one is using them)
  static async cleanupAbandonedSessions() {
    try {
      console.log('SessionService: Cleaning up abandoned sessions')
      
      // Find sessions that are active but have no recent activity
      // (older than 30 minutes and no participants)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      
      const { data: abandonedSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, created_at')
        .eq('status', 'active')
        .lt('created_at', thirtyMinutesAgo)
      
      if (fetchError) {
        console.error('Error fetching abandoned sessions:', fetchError)
        return { error: fetchError }
      }
      
      if (!abandonedSessions || abandonedSessions.length === 0) {
        console.log('No abandoned sessions found')
        return { error: null }
      }
      
      console.log(`Found ${abandonedSessions.length} abandoned sessions`)
      
      // Clean up each abandoned session
      for (const session of abandonedSessions) {
        console.log('Cleaning up abandoned session:', session.id)
        await this.cleanupSession(session.id)
      }
      
      console.log('Abandoned sessions cleanup completed')
      return { error: null }
    } catch (err) {
      console.error('Error during abandoned sessions cleanup:', err)
      return { error: err }
    }
  }

  // Clean up sessions when user navigates away (for specific user sessions)
  static async cleanupUserSessions(userId) {
    try {
      console.log('SessionService: Cleaning up sessions for user:', userId)
      
      // Find all active sessions hosted by this user
      const { data: userSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id')
        .eq('host_id', userId)
        .eq('status', 'active')
      
      if (fetchError) {
        console.error('Error fetching user sessions:', fetchError)
        return { error: fetchError }
      }
      
      if (!userSessions || userSessions.length === 0) {
        console.log('No active sessions found for user')
        return { error: null }
      }
      
      console.log(`Found ${userSessions.length} active sessions for user`)
      
      // Clean up each session
      for (const session of userSessions) {
        console.log('Cleaning up user session:', session.id)
        await this.cleanupSession(session.id)
      }
      
      console.log('User sessions cleanup completed')
      return { error: null }
    } catch (err) {
      console.error('Error during user sessions cleanup:', err)
      return { error: err }
    }
  }

  // Get responses for a specific question
  static async getQuestionResponses(sessionId, questionId) {
    console.log('SessionService.getQuestionResponses called with:', { sessionId, questionId })
    
    // Use the new ResponsesService
    return await ResponsesService.getQuestionResponses(sessionId, questionId)
  }
}
