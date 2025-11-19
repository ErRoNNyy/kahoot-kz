import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { SessionService } from '../services/session.js'
import bgSession from '../assets/bg_session.png'
import avatarBrownMouse from '../assets/avatars/brown_mouse.png'
import avatarGrayKoala from '../assets/avatars/gray_coala.png'
import avatarGreenDragon from '../assets/avatars/green_dragon.png'
import avatarMonkey from '../assets/avatars/monkey.png'
import avatarOrangeCat from '../assets/avatars/orange_cat.png'
import avatarPanda from '../assets/avatars/panda.png'
import avatarRedParrot from '../assets/avatars/red_parrot.png'
import avatarSkunk from '../assets/avatars/skuns.png'
import avatarWhiteBear from '../assets/avatars/white_bear.png'
import avatarYellowBear from '../assets/avatars/yellow_bear.png'

const AVATAR_OPTIONS = [
  { id: 'brown_mouse', label: 'Mouse', image: avatarBrownMouse },
  { id: 'gray_coala', label: 'Koala', image: avatarGrayKoala },
  { id: 'green_dragon', label: 'Dragon', image: avatarGreenDragon },
  { id: 'monkey', label: 'Monkey', image: avatarMonkey },
  { id: 'orange_cat', label: 'Cat', image: avatarOrangeCat },
  { id: 'panda', label: 'Panda', image: avatarPanda },
  { id: 'red_parrot', label: 'Parrot', image: avatarRedParrot },
  { id: 'skuns', label: 'Skunk', image: avatarSkunk },
  { id: 'white_bear', label: 'Polar Bear', image: avatarWhiteBear },
  { id: 'yellow_bear', label: 'Bear', image: avatarYellowBear }
]

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
    () =>
      participants.filter(
        (participant) => participant?.is_active !== false && !participant?.left_at
      ),
    [participants]
  )

  const avatarLookup = useMemo(() => {
    return AVATAR_OPTIONS.reduce((acc, option) => {
      acc[option.id] = option
      return acc
    }, {})
  }, [])

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

  useEffect(() => {
    if (session?.id) {
      console.log('Session created, loading participants...')
      loadParticipants()
    }
  }, [session?.id])

  useEffect(() => {
    if (!session?.id) return

    console.log('Setting up real-time subscription for session:', session.id)

    const participantsSubscription = SessionService.subscribeToParticipants(session.id, () => {
      console.log('Participants update received for host lobby')
      loadParticipants()
    })

    const responsesSubscription = SessionService.subscribeToResponses(session.id, () => {
      console.log('Responses update received for host lobby')
      loadParticipants()
    })

    const interval = setInterval(() => {
      console.log('Periodic participants refresh (fallback)...')
      loadParticipants()
    }, 20000)

    return () => {
      console.log('Cleaning up host lobby subscriptions')
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
    console.log('Manual refresh of participants...')
    await loadParticipants()
  }

  const closeSession = async () => {
    if (!session?.id) return

    const confirmed = window.confirm(
      'Are you sure you want to close this session?\n\n' +
        'This will remove all participants and end the session permanently.\n' +
        'This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      console.log('Closing session from host lobby:', session.id)
      setLoading(true)

      const { error } = await SessionService.cleanupSession(session.id)

      if (error) {
        console.error('Error closing session:', error)
        setError('Failed to close session')
        alert('❌ Failed to close session. Please try again.')
      } else {
        console.log('Session closed successfully')
        alert(
          '✅ Session closed successfully!\n\nAll participants have been removed and the session has been ended.'
        )
        setSession(null)
        setParticipants([])
      }
    } catch (err) {
      console.error('Error closing session:', err)
      setError('Failed to close session')
      alert('❌ Failed to close session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartQuiz = () => {
    if (!session) return

    onNavigate('quiz-host-control', {
      sessionData: { session, participant: null, autoStart: true }
    })
  }

  if (session) {
    const quizTitle = selectedQuiz?.title || session?.quiz_title || 'Quiz Room'
    const waitingMessage =
      activeParticipants.length === 0
        ? 'Waiting for participants…'
        : `${activeParticipants.length} participant${activeParticipants.length === 1 ? '' : 's'} ready`
    const canStart = activeParticipants.length > 0

    return (
      <div className="relative min-h-screen overflow-hidden">
        <img src={bgSession} alt="Fairy tale castle" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute left-6 top-6 z-20 flex gap-3">
          <button
            onClick={closeSession}
            disabled={loading}
            className="rounded-full bg-white/85 px-6 py-3 text-sm font-semibold text-red-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Closing…' : 'Close session'}
          </button>
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
            {error && (
              <div className="mx-auto mb-6 max-w-xl rounded-2xl bg-red-500/90 px-6 py-3 text-sm font-semibold text-white shadow-lg">
                {error}
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-lg rounded-[3rem] bg-white/95 px-12 py-10 shadow-[0_35px_80px_-45px_rgba(0,0,0,0.65)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Quiz code</p>
              <p className="mt-2 text-6xl font-black text-slate-900 tracking-[0.15em]">{session.code}</p>
            </motion.div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="inline-block rounded-2xl bg-white/90 px-8 py-3 shadow-lg">
                <h2 className="text-3xl font-bold text-slate-900">{quizTitle}</h2>
              </div>
              <div className="inline-flex items-center gap-3 rounded-full bg-yellow-200/90 px-6 py-2 text-sm font-semibold text-slate-800 shadow-md">
                <span>{waitingMessage}</span>
              </div>
            </div>

            <div className="mt-10">
              {participantsLoading ? (
                <div className="mx-auto flex max-w-sm items-center justify-center gap-3 rounded-3xl bg-white/85 px-6 py-4 text-slate-600 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                  <span>Loading participants…</span>
                </div>
              ) : activeParticipants.length === 0 ? (
                <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl bg-white/85 px-8 py-10 text-slate-600 shadow-lg">
                  <span className="text-4xl">👋</span>
                  <p className="mt-3 text-base font-semibold">No one has joined yet.</p>
                  <p className="text-sm text-slate-500">Share the code above to invite players.</p>
                </div>
              ) : (
                <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {activeParticipants.map((participant, index) => {
                    const avatar = participant.avatar ? avatarLookup[participant.avatar] : null
                    return (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-[2.5rem] bg-white/90 px-6 py-6 text-center shadow-[0_25px_60px_-40px_rgba(0,0,0,0.7)]"
                      >
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[2rem] bg-[#FFF4E6]">
                          {avatar ? (
                            <img src={avatar.image} alt={avatar.label} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-4xl text-slate-500">{(participant.nickname || 'Guest')[0] || '?'}</span>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-slate-900">{participant.nickname || 'Guest'}</p>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <motion.button
                whileHover={{ scale: canStart ? 1.05 : 1 }}
                whileTap={{ scale: canStart ? 0.97 : 1 }}
                disabled={!canStart}
                onClick={handleStartQuiz}
                className="rounded-full bg-[#FF8A24] px-12 py-4 text-lg font-semibold text-white transition hover:bg-[#ff9c45] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canStart ? 'Start quiz' : 'Waiting for players'}
              </motion.button>
              <div className="text-xs font-semibold uppercase tracking-wide text-white/70">
                {activeParticipants.length} / {participants.length || 0} players active
              </div>
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
