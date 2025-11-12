import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { getUserDisplayName, getUserAvatar } from '../utils/userHelpers.js'

export default function DashboardPage({ onNavigate }) {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)

  // Debug user data
  console.log('DashboardPage - User data:', user)
  console.log('DashboardPage - User metadata:', user?.user_metadata)
  console.log('DashboardPage - Display name:', getUserDisplayName(user))

  useEffect(() => {
    if (user && !user.isGuest) {
      loadQuizzes()
    }
  }, [user])

  const loadQuizzes = async () => {
    // Check if user exists and is not a guest
    if (!user) {
      console.log('No user found, skipping quiz loading')
      setLoading(false)
      return
    }

    if (user.isGuest) {
      setLoading(false)
      return
    }

    console.log('Loading quizzes for user:', user.id)
    
    try {
      const { data, error } = await QuizService.getUserQuizzes(user.id)
      console.log('Quizzes loaded:', { data, error })
      
      if (error) {
        console.error('Error loading quizzes:', error)
        // Show error to user
        alert(`Error loading quizzes: ${error.message}`)
      } else {
        console.log('Setting quizzes:', data || [])
        setQuizzes(data || [])
      }
    } catch (err) {
      console.error('Error loading quizzes:', err)
      alert(`Error loading quizzes: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const refreshQuizzes = async () => {
    console.log('Manually refreshing quizzes...')
    setLoading(true)
    await loadQuizzes()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <div className="space-y-1">
          <div className="px-6 py-5 md:px-12 lg:px-20">
            <motion.section
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="relative w-full overflow-hidden rounded-[2.5rem] border border-emerald-300/60 bg-emerald-900/35 px-4 py-12 text-white shadow-[0_40px_90px_-50px_rgba(15,23,42,0.8)] backdrop-blur-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/75 via-emerald-700/55 to-teal-600/50"></div>
              <div className="absolute inset-0 opacity-25">
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.3),transparent_55%)]"></div>
              </div>
              <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 md:flex-row md:items-center md:justify-between md:px-10">
                <div className="flex items-center gap-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-emerald-100/70 bg-emerald-400/25 text-4xl shadow-[0_18px_32px_-12px_rgba(15,23,42,0.45)] ring-4 ring-emerald-200/50"
                  >
                    {getUserAvatar(user)}
                  </motion.div>
                  <div className="max-w-2xl">
                    <p className="text-sm uppercase tracking-[0.35em] text-white/70">Dashboard</p>
                    <h1 className="mt-3 text-[2.25rem] font-bold sm:text-[2.75rem]">
                      Welcome back, {getUserDisplayName(user)}!
                    </h1>
                    <p className="mt-4 text-base text-white/85 sm:text-lg">
                      Create engaging quizzes, host live sessions, or join games in seconds. Use the navigation
                      above to jump straight into your next activity.
                    </p>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full max-w-xs rounded-3xl border border-emerald-200/50 bg-emerald-600/50 p-6 text-right shadow-xl backdrop-blur"
                >
                  {!user?.isGuest ? (
                    <>
                      <p className="text-sm font-medium text-white/80">Your quizzes</p>
                      <p className="mt-2 text-5xl font-semibold leading-tight">
                        {loading ? '—' : quizzes.length}
                      </p>
                      <button
                        type="button"
                        onClick={refreshQuizzes}
                        disabled={loading}
                        className={`mt-6 inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                          loading
                            ? 'cursor-not-allowed border-emerald-100/40 bg-emerald-500/20 text-white/70'
                            : 'border-transparent bg-white text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        <span className="text-base">🔄</span>
                        Refresh Quizzes
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white/80">Guest mode active</p>
                      <p className="mt-3 text-sm text-white/80">
                        Use the header actions to jump into a session with your access code.
                      </p>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.section>
          </div>

          <div className="space-y-1 px-6 py-5 md:px-12 lg:px-20">
            {!user?.isGuest && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full rounded-[2.5rem] border border-emerald-200/50 bg-gradient-to-br from-emerald-600/70 via-emerald-500/60 to-teal-400/60 px-4 py-12 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.8)] backdrop-blur-xl"
              >
                <div className="mx-auto max-w-7xl px-6 text-center md:px-10">
                  <h2 className="text-[2.75rem] font-extrabold tracking-tight text-white">My Quizzes</h2>
                  <p className="mb-8 text-sm font-semibold uppercase tracking-[0.35em] text-white/60">
                    Manage and launch your creations
                  </p>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/50 border-t-transparent"></div>
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="py-16 text-center text-white">
                      <div className="mb-6 text-7xl">📚</div>
                      <p className="mb-6 text-lg text-white/80">No quizzes created yet</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => onNavigate('create-quiz')}
                        className="rounded-full bg-white/90 px-9 py-3 text-lg font-semibold text-purple-600 transition-colors hover:bg-white"
                      >
                        Create Your First Quiz
                      </motion.button>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {quizzes.map((quiz, index) => (
                        <motion.div
                          key={quiz.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="group flex h-full flex-col justify-between rounded-3xl border border-emerald-100/30 bg-white/15 p-8 text-center text-white transition-all hover:-translate-y-1 hover:bg-white/20 hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.9)]"
                        >
                          <div>
                            <h3 className="mb-2 text-2xl font-semibold tracking-tight text-white">{quiz.title}</h3>
                            <p className="mb-6 text-sm text-white/75">{quiz.description}</p>
                          </div>
                          <div className="mt-auto flex flex-col items-center gap-4 text-xs font-medium uppercase tracking-wide text-white/60">
                            <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                            <div className="flex space-x-3 text-base">
                              <button 
                                type="button"
                                onClick={() => onNavigate('create-quiz', { editQuizId: quiz.id })}
                                className="flex items-center space-x-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-600"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                              <button 
                                type="button"
                                onClick={() => onNavigate('host-session', { selectedQuiz: quiz })}
                                className="flex items-center space-x-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-purple-600"
                              >
                                <span>🎯</span>
                                <span>Host</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
