import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { SessionService } from '../services/session.js'

export default function SessionHostPage({ onNavigate, onSessionCreated }) {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [quizzesLoading, setQuizzesLoading] = useState(true)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState([])
  const [participantsLoading, setParticipantsLoading] = useState(false)

  const activeParticipants = useMemo(
    () => participants.filter((participant) => participant?.is_active !== false && !participant?.left_at),
    [participants]
  )

  useEffect(() => {
    if (user && !user.isGuest) {
      // Force refresh quizzes when page loads
      console.log('Host session page loaded, forcing quiz refresh...')
      loadQuizzes()
    }
  }, [user])

  // Also refresh when component mounts
  useEffect(() => {
    if (user && !user.isGuest) {
      console.log('Host session component mounted, refreshing quizzes...')
      loadQuizzes()
    }
  }, [])

  // Load participants when session is created
  useEffect(() => {
    if (session?.id) {
      console.log('Session created, loading participants...')
      loadParticipants()
    }
  }, [session])

  // Set up real-time subscription for participants
  useEffect(() => {
    if (!session?.id) return

    console.log('Setting up real-time subscription for session:', session.id)
    
    const participantsSubscription = SessionService.subscribeToParticipants(session.id, (payload) => {
      console.log('Participants update received:', payload)
      // Refresh participants when someone joins
      loadParticipants()
    })

    const responsesSubscription = SessionService.subscribeToResponses(session.id, (payload) => {
      console.log('Responses update received:', payload)
      // Refresh participants when someone answers (for score updates)
      loadParticipants()
    })

    // Also set up a periodic refresh as backup
    const interval = setInterval(() => {
      console.log('Periodic participants refresh...')
      loadParticipants()
    }, 5000) // Refresh every 5 seconds

    return () => {
      console.log('Cleaning up real-time subscriptions and interval')
      participantsSubscription?.unsubscribe()
      responsesSubscription?.unsubscribe()
      clearInterval(interval)
    }
  }, [session?.id])

  const loadQuizzes = async () => {
    // Check if user exists and is not a guest
    if (!user) {
      console.log('No user found, skipping quiz loading')
      setQuizzesLoading(false)
      return
    }

    if (user.isGuest) {
      setError('Guests cannot host sessions. Please sign up to create quizzes.')
      setQuizzesLoading(false)
      return
    }

    console.log('Loading quizzes for host session, user ID:', user.id)
    setQuizzesLoading(true)
    setError('')
    
    try {
      const { data, error } = await QuizService.getUserQuizzes(user.id)
      console.log('Host session quizzes loaded:', { data, error })
      
      if (error) {
        console.error('Error loading quizzes for host session:', error)
        setError(`Failed to load quizzes: ${error.message}`)
      } else {
        console.log('Setting quizzes for host session:', data || [])
        setQuizzes(data || [])
      }
    } catch (err) {
      console.error('Error loading quizzes for host session:', err)
      setError(`Failed to load quizzes: ${err.message}`)
    } finally {
      setQuizzesLoading(false)
    }
  }

  const startSession = async () => {
    if (!selectedQuiz) {
      setError('Please select a quiz')
      return
    }

    if (!user) {
      setError('User not found. Please sign in again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Creating session for quiz:', selectedQuiz.id, 'host:', user.id)
      const { data, error } = await SessionService.createSession(selectedQuiz.id, user.id)
      console.log('Session creation result:', { data, error })
      
      if (error) {
        console.error('Session creation error:', error)
        setError(`Failed to create session: ${error.message}`)
      } else {
        console.log('Session created successfully:', data)
        setSession(data)
        onSessionCreated(data)
      }
    } catch (err) {
      console.error('Session creation failed:', err)
      setError(`Failed to create session: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async () => {
    if (!session?.id) return

    console.log('Loading participants for session:', session.id)
    setParticipantsLoading(true)
    
    try {
      const { data, error } = await SessionService.getLeaderboard(session.id)
      console.log('Participants loaded:', { data, error })
      
      if (error) {
        console.error('Error loading participants:', error)
      } else {
        setParticipants(data || [])
      }
    } catch (err) {
      console.error('Error loading participants:', err)
    } finally {
      setParticipantsLoading(false)
    }
  }

  const refreshParticipants = async () => {
    console.log('Refreshing participants...')
    await loadParticipants()
  }

  const closeSession = async () => {
    if (!session?.id) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to close this session?\n\n' +
      'This will remove all participants and end the session permanently.\n' +
      'This action cannot be undone.'
    )
    
    if (!confirmed) return
    
    try {
      console.log('Closing session:', session.id)
      setLoading(true)
      
      // Clean up the session
      const { error } = await SessionService.cleanupSession(session.id)
      
      if (error) {
        console.error('Error closing session:', error)
        setError('Failed to close session')
      } else {
        console.log('Session closed successfully')
        alert('✅ Session closed successfully!\n\nAll participants have been removed and the session has been ended.')
        setSession(null)
        onNavigate('dashboard')
      }
    } catch (err) {
      console.error('Error closing session:', err)
      setError('Failed to close session')
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

        <div className="relative mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-10 text-center text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-2xl"
          >
            <div className="mb-6 text-6xl">🎉</div>
            <h1 className="mb-4 text-3xl font-bold text-emerald-900">Session Created!</h1>
            <p className="mb-6 text-emerald-600">Share this code with participants to join your quiz</p>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
              <p className="mb-2 text-sm text-emerald-700">Session Code</p>
              <div className="font-mono text-4xl font-bold text-emerald-900 tracking-wider">
                {session.code}
              </div>
            </div>

            {/* Participants Section */}
            <div className="mb-6 rounded-2xl border border-emerald-100/80 bg-white/85 p-6 text-left shadow-inner">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-emerald-900">
                  Participants ({activeParticipants.length})
                  {participants.length !== activeParticipants.length && (
                    <span className="ml-2 text-sm text-emerald-500">
                      {participants.length - activeParticipants.length} left
                    </span>
                  )}
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={refreshParticipants}
                    disabled={participantsLoading}
                    className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {participantsLoading ? '🔄' : '🔄'} Refresh
                  </button>
                </div>
              </div>

              {participantsLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading participants...</p>
                </div>
              ) : participants.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">👥</div>
                  <p className="text-emerald-600">No participants yet</p>
                  <p className="text-sm text-emerald-500">Share the session code to invite people</p>
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
                        participant?.is_active === false || participant?.left_at
                          ? 'border border-emerald-100/60 bg-emerald-50/60 opacity-70'
                          : 'border border-transparent bg-white/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-bold text-emerald-950">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-emerald-900">
                            {participant.nickname || 'Anonymous'}
                            {(participant?.is_active === false || participant?.left_at) && (
                              <span className="ml-2 text-xs uppercase tracking-wide text-emerald-500">Left</span>
                            )}
                          </p>
                          <p className="text-sm text-emerald-500">Joined {new Date(participant.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{participant.score || 0} points</p>
                        <p className="text-xs text-emerald-500">Score</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log('SessionHostPage: Starting quiz with session:', session)
                  onNavigate('quiz-host-control', { sessionData: { session: session, participant: null } })
                }}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Start Quiz
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={closeSession}
                disabled={loading}
                className="rounded-full bg-red-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Closing...' : 'Close Session'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">Host Session</h1>
            <p className="text-emerald-100">Select a quiz to start hosting</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('dashboard')}
            className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-6 py-3 text-emerald-50 transition-colors hover:bg-emerald-500/30"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/80 via-white/70 to-emerald-50/70 p-8 text-emerald-800 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100"
            >
              {error}
            </motion.div>
          )}

          {user?.isGuest ? (
            <div className="py-8 text-center">
              <div className="mb-4 text-6xl">👤</div>
              <h2 className="mb-4 text-2xl font-bold text-emerald-900">Guest Users Cannot Host</h2>
              <p className="mb-6 text-emerald-500">Please sign up to create and host quizzes</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('dashboard')}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Back to Dashboard
              </motion.button>
            </div>
          ) : quizzesLoading ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent"></div>
              <p className="text-emerald-600">Loading quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-4 text-6xl">📚</div>
              <h2 className="mb-4 text-2xl font-bold text-emerald-900">No Quizzes Available</h2>
              <p className="mb-6 text-emerald-600">Create a quiz first to start hosting sessions</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('create-quiz')}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Create Quiz
              </motion.button>
            </div>
          ) : (
            <div>
              <h2 className="mb-6 text-2xl font-bold text-emerald-900">Select a Quiz to Host</h2>
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                {quizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedQuiz(quiz)}
                    className={`cursor-pointer rounded-2xl border-2 p-4 transition-all backdrop-blur ${
                      selectedQuiz?.id === quiz.id
                        ? 'border-emerald-300 bg-emerald-200/30 shadow-[0_12px_30px_-20px_rgba(16,185,129,0.9)]'
                        : 'border-emerald-100/60 bg-white/50 hover:border-emerald-200 hover:bg-white/70'
                    }`}
                  >
                    <h3 className="mb-2 font-bold text-emerald-900">{quiz.title}</h3>
                    <p className="text-sm text-emerald-700">{quiz.description}</p>
                    <div className="mt-2 text-xs text-emerald-500">
                      Created {new Date(quiz.created_at).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSession}
                disabled={!selectedQuiz || loading}
                className="w-full rounded-full bg-emerald-500 py-3 px-4 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Creating Session...' : 'Start Session'}
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
