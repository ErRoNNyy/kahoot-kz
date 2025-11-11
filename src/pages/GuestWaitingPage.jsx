import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'

export default function GuestWaitingPage({ sessionData, onNavigate }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  const sessionId = sessionData?.session?.id
  const participantId = sessionData?.participant?.id

  useEffect(() => {
    if (sessionData) {
      loadSession()
      subscribeToUpdates()
    }
  }, [sessionData])

  const loadSession = async () => {
    if (!sessionId) return

    try {
      console.log('Loading session for guest:', sessionId)
      const { data, error } = await SessionService.getSession(sessionId)
      if (error) {
        console.error('Error loading session:', error)
        setError('Failed to load session')
      } else {
        console.log('Session loaded for guest:', data)
        setSession(data)
        loadParticipants()
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async () => {
    if (!sessionId) return

    try {
      console.log('Loading participants for guest session:', sessionId)
      const { data, error } = await SessionService.getLeaderboard(sessionId)
      if (error) {
        console.error('Error loading participants:', error)
      } else {
        console.log('Participants loaded for guest:', data)
        const activeParticipants =
          (data || []).filter((participant) => participant?.is_active !== false && !participant?.left_at)
        setParticipants(activeParticipants)
      }
    } catch (err) {
      console.error('Error loading participants:', err)
    }
  }

  const subscribeToUpdates = () => {
    if (!sessionId) return

    console.log('Setting up real-time subscription for guest session:', sessionId)
    
    // Subscribe to participants joining
    const participantsSubscription = SessionService.subscribeToParticipants(sessionId, (payload) => {
      console.log('Guest received participants update:', payload)
      loadParticipants()
    })

    // Subscribe to session updates (when host starts quiz or ends session)
    const sessionSubscription = SessionService.subscribeToSession(sessionId, (payload) => {
      if (payload.new.current_question) {
        // Host started the quiz, redirect to play
        const updatedSessionData = { session: payload.new, participant: sessionData.participant }
        console.log('Guest redirecting to play-quiz with sessionData:', updatedSessionData)
        // Clear the interval to stop periodic checks
        clearInterval(interval)
        onNavigate('play-quiz', { sessionData: updatedSessionData })
      } else if (payload.eventType === 'DELETE' || !payload.new) {
        // Session was deleted by host
        console.log('Guest: Session was ended by host')
        clearInterval(interval)
        alert('❌ Session ended by host!\n\nThe quiz session has been ended and you have been disconnected.')
        onNavigate('guest-welcome')
      }
    })

    // Periodic refresh as backup
    let interval = setInterval(async () => {
      console.log('Periodic participants refresh for guest...')
      loadParticipants()
      
      // Also check if session has been updated (fallback for real-time)
      try {
        const { data: updatedSession, error } = await SessionService.getSession(sessionId)
        if (error && error.code === 'PGRST116') {
          console.log('Guest periodic check - session not found, host ended session')
          clearInterval(interval)
          alert('❌ Session ended by host!\n\nThe quiz session has been ended and you have been disconnected.')
          onNavigate('guest-welcome')
        } else if (!error && updatedSession && updatedSession.current_question) {
          const updatedSessionData = { session: updatedSession, participant: sessionData.participant }
          console.log('Guest periodic check - redirecting to play-quiz')
          clearInterval(interval)
          onNavigate('play-quiz', { sessionData: updatedSessionData })
        }
      } catch (err) {
        console.error('Error checking session status:', err)
      }
    }, 1000) // Check every 1 second

    return () => {
      console.log('Cleaning up guest subscriptions')
      participantsSubscription?.unsubscribe()
      sessionSubscription?.unsubscribe()
      clearInterval(interval)
    }
  }

  const handleLeaveSession = async () => {
    if (!sessionId || !participantId) {
      onNavigate('guest-welcome')
      return
    }

    try {
      setLeaving(true)
      console.log('Guest waiting page: leaving session', { sessionId, participantId })
      const { error: leaveError } = await SessionService.leaveSession(sessionId, participantId)

      if (leaveError) {
        console.error('Failed to leave session from waiting page:', leaveError)
        setError('Failed to leave session. Please try again.')
        setLeaving(false)
        return
      }

      setLeaving(false)
      onNavigate('guest-welcome')
    } catch (err) {
      console.error('Error leaving session from waiting page:', err)
      setError('Failed to leave session. Please try again.')
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md"
        >
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('guest-welcome')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Welcome
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {session?.quizzes?.title || 'Quiz Session'}
            </h1>
            <p className="text-purple-200">Room Code: {sessionData.session.code}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLeaveSession}
          disabled={leaving}
          className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
          {leaving ? 'Leaving...' : 'Leave Room'}
          </motion.button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Waiting Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Host</h2>
              <p className="text-gray-600">The host will start the quiz soon</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Room Code</p>
                <div className="text-3xl font-bold text-purple-600 font-mono">
                  {sessionData.session.code}
                </div>
                <p className="text-xs text-gray-500 mt-2">Share this code with friends!</p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Waiting for quiz to start...</p>
            </div>
          </motion.div>

          {/* Participants */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Participants ({participants.length})</h3>
              <button
                onClick={loadParticipants}
                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-gray-600">No participants yet</p>
                <p className="text-sm text-gray-500">You're the first one here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.user_id === user.id 
                        ? 'bg-purple-50 border-2 border-purple-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {participant.nickname || 'Anonymous'}
                          {participant.user_id === user.id && ' (You)'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Joined {new Date(participant.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{participant.score || 0}</p>
                      <p className="text-xs text-gray-500">points</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
