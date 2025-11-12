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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-200 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 p-6">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mx-auto max-w-md rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-center text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
        >
          <div className="mb-4 text-6xl">❌</div>
          <h2 className="mb-4 text-2xl font-bold text-emerald-900">Error</h2>
          <p className="mb-6 text-emerald-600">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('guest-welcome')}
            className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            Back to Welcome
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              {session?.quizzes?.title || 'Quiz Session'}
            </h1>
            <p className="text-emerald-100">Room Code: {sessionData.session.code}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLeaveSession}
          disabled={leaving}
            className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
          {leaving ? 'Leaving...' : 'Leave Room'}
          </motion.button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Waiting Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">⏳</div>
              <h2 className="mb-2 text-2xl font-bold text-emerald-900">Waiting for Host</h2>
              <p className="text-emerald-600">The host will start the quiz soon</p>
            </div>

            <div className="mb-6 rounded-2xl border border-emerald-100/80 bg-emerald-100/60 p-6 text-center">
              <div className="text-center">
                <p className="mb-2 text-sm text-emerald-700">Room Code</p>
                <div className="font-mono text-3xl font-bold text-emerald-900 tracking-wider">
                  {sessionData.session.code}
                </div>
                <p className="mt-2 text-xs text-emerald-600">Share this code with friends!</p>
              </div>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent"></div>
              <p className="text-emerald-600">Waiting for quiz to start...</p>
            </div>
          </motion.div>

          {/* Participants */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-emerald-900">Participants ({participants.length})</h3>
              <button
                onClick={loadParticipants}
                className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/30"
              >
                🔄 Refresh
              </button>
            </div>

            {participants.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-4xl">👥</div>
                <p className="text-emerald-600">No participants yet</p>
                <p className="text-sm text-emerald-500">You're the first one here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      participant.user_id === user.id 
                        ? 'border-2 border-emerald-300 bg-emerald-100/60 shadow-[0_12px_25px_-20px_rgba(16,185,129,0.9)]' 
                        : 'border border-emerald-100/60 bg-white/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-emerald-950">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-emerald-900">
                          {participant.nickname || 'Anonymous'}
                          {participant.user_id === user.id && ' (You)'}
                        </p>
                        <p className="text-sm text-emerald-500">
                          Joined {new Date(participant.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{participant.score || 0}</p>
                      <p className="text-xs text-emerald-500">points</p>
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
