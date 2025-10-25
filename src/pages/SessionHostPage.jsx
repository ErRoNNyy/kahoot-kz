import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { SessionService } from '../services/session.js'
import { debugUserQuizzes } from '../utils/debugQuizzes.js'

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

  const debugQuizzes = async () => {
    if (!user?.id) {
      setError('❌ No user ID found!')
      return
    }
    
    console.log('🔍 Starting quiz debug for host session...')
    const result = await debugUserQuizzes(user.id)
    
    if (result.success) {
      const message = `🔍 Quiz Debug Results:
📊 Total quizzes in DB: ${result.allQuizzes.length}
👤 Your quizzes: ${result.userQuizzes.length}
🆔 All user IDs: ${result.allUserIds.join(', ')}
✅ Your ID found: ${result.userFound ? 'Yes' : 'No'}`
      alert(message)
      console.log('Full debug result:', result)
    } else {
      setError(`❌ Debug failed: ${result.error?.message || 'Unknown error'}`)
    }
  }

  const refreshQuizzes = async () => {
    console.log('Refreshing quizzes for host session...')
    setQuizzesLoading(true)
    setError('')
    await loadQuizzes()
  }

  const forceRefreshQuizzes = async () => {
    console.log('Force refreshing quizzes for host session...')
    setQuizzesLoading(true)
    setError('')
    setQuizzes([]) // Clear existing quizzes
    await loadQuizzes()
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
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl text-center"
          >
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Session Created!</h1>
            <p className="text-gray-600 mb-6">Share this code with participants to join your quiz</p>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            <div className="bg-purple-100 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Session Code</p>
              <div className="text-4xl font-bold text-purple-600 font-mono">
                {session.code}
              </div>
            </div>

            {/* Participants Section */}
            <div className="bg-white rounded-lg p-6 mb-6 border-2 border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Participants ({participants.length})</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={refreshParticipants}
                    disabled={participantsLoading}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
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
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-gray-600">No participants yet</p>
                  <p className="text-sm text-gray-500">Share the session code to invite people</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{participant.nickname || 'Anonymous'}</p>
                          <p className="text-sm text-gray-500">Joined {new Date(participant.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">{participant.score || 0} points</p>
                        <p className="text-xs text-gray-500">Score</p>
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
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start Quiz
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={closeSession}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Host Session</h1>
            <p className="text-purple-200">Select a quiz to start hosting</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('dashboard')}
            className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Debug Section */}
        {!user?.isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 rounded-2xl p-6 shadow-xl mb-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Debug Tools</h2>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p><strong>User ID:</strong> {user?.id || 'No user ID'}</p>
              <p><strong>Is Guest:</strong> {user?.isGuest ? 'Yes' : 'No'}</p>
              <p><strong>Quizzes Count:</strong> {quizzes.length}</p>
              <p><strong>Quizzes Loading:</strong> {quizzesLoading ? 'Yes' : 'No'}</p>
              <p><strong>Selected Quiz:</strong> {selectedQuiz?.title || 'None'}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={debugQuizzes}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                🔍 Debug Quizzes
              </button>
              <button
                onClick={refreshQuizzes}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                🔄 Refresh Quizzes
              </button>
              <button
                onClick={forceRefreshQuizzes}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                🔥 Force Refresh
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}

          {user?.isGuest ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👤</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Guest Users Cannot Host</h2>
              <p className="text-gray-600 mb-6">Please sign up to create and host quizzes</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('dashboard')}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Back to Dashboard
              </motion.button>
            </div>
          ) : quizzesLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">No Quizzes Available</h2>
              <p className="text-gray-600 mb-6">Create a quiz first to start hosting sessions</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('create-quiz')}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Quiz
              </motion.button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Select a Quiz to Host</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {quizzes.map((quiz) => (
                  <motion.div
                    key={quiz.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedQuiz(quiz)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedQuiz?.id === quiz.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-bold text-gray-800 mb-2">{quiz.title}</h3>
                    <p className="text-gray-600 text-sm">{quiz.description}</p>
                    <div className="text-xs text-gray-500 mt-2">
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
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
