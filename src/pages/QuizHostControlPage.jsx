import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { SessionService } from '../services/session.js'
import { ResponsesService } from '../services/responses.js'
import bgSession from '../assets/bg_session.png'

export default function QuizHostControlPage({ sessionData, onNavigate }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [participants, setParticipants] = useState([])
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [questionActive, setQuestionActive] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [quizEnded, setQuizEnded] = useState(false)
  const autoStartTriggeredRef = useRef(false)
  
  // Countdown states for quiz starting animation
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownValue, setCountdownValue] = useState(5)

  const sessionId = sessionData?.session ? sessionData.session.id : sessionData?.id

  const activeParticipants = useMemo(
    () => participants.filter((participant) => participant?.is_active !== false && !participant?.left_at),
    [participants]
  )

  const loadQuiz = useCallback(async (quizId) => {
    try {
      console.log('Loading quiz for host:', quizId)
      const { data, error } = await QuizService.getQuizWithQuestions(quizId)
      if (error) {
        console.error('Error loading quiz:', error)
        setError('Failed to load quiz')
      } else {
        console.log('Quiz loaded for host:', data)
        setQuiz(data)
        setQuestions(data.questions || [])
      }
    } catch (err) {
      console.error('Error loading quiz:', err)
      setError('Failed to load quiz')
    }
  }, [])

  const loadParticipants = useCallback(async () => {
    if (!sessionId) return

    try {
      console.log('Loading participants for host session:', sessionId)
      const { data, error } = await SessionService.getLeaderboard(sessionId)
      if (error) {
        console.error('Error loading participants:', error)
      } else {
        console.log('Participants loaded for host:', data)
        setParticipants(data || [])
      }
    } catch (err) {
      console.error('Error loading participants:', err)
    }
  }, [sessionId])

  const loadSession = useCallback(async () => {
    if (!sessionId) return

    try {
      console.log('Loading session for host control:', sessionId)
      const { data, error } = await SessionService.getSession(sessionId)
      if (error) {
        console.error('Error loading session:', error)
        setError('Failed to load session')
      } else if (data) {
        console.log('Session loaded for host:', data)
        setSession(data)

        if (data.quiz_id) {
          await loadQuiz(data.quiz_id)
        }

        await loadParticipants()
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [sessionId, loadQuiz, loadParticipants])

  const loadResponses = useCallback(async (questionId) => {
    const activeQuestionId = questionId ?? currentQuestion?.id

    if (!sessionId || !activeQuestionId) {
      console.log('loadResponses: Missing sessionId or questionId', { sessionId, activeQuestionId })
      return
    }

    try {
      console.log('Host loading responses for question:', activeQuestionId)

      const { data, error } = await SessionService.getQuestionResponses(sessionId, activeQuestionId)
      console.log('Host responses loaded:', {
        data,
        error,
        count: data?.length || 0,
        questionId: activeQuestionId
      })

      if (!error) {
        setResponses(data || [])

        const activeCount = participants.filter(
          (participant) => participant?.is_active !== false && !participant?.left_at
        ).length

        if (data && data.length >= activeCount && activeCount > 0) {
          console.log('✅ All active participants have answered')
        }
      } else {
        console.error('❌ Error loading responses:', error)
      }
    } catch (err) {
      console.error('Error loading responses:', err)
    }
  }, [sessionId, currentQuestion?.id, participants])

  useEffect(() => {
    console.log('QuizHostControlPage: sessionData received:', sessionData)
    console.log('QuizHostControlPage: sessionData type:', typeof sessionData)
    console.log('QuizHostControlPage: sessionData keys:', sessionData ? Object.keys(sessionData) : 'null')
    console.log('QuizHostControlPage: resolved sessionId:', sessionId)

    if (sessionId) {
      loadSession()
    } else {
      console.error('QuizHostControlPage: No sessionData or session found')
      setError('No session data available')
      setLoading(false)
    }
  }, [sessionData, sessionId, loadSession])

  useEffect(() => {
    if (!sessionId) return

    console.log('Setting up real-time subscription for host session:', sessionId)

    const sessionSubscription = SessionService.subscribeToSession(sessionId, (payload) => {
      console.log('Host received session update:', payload)
      loadSession()
    })

    const participantsSubscription = SessionService.subscribeToParticipants(sessionId, (payload) => {
      console.log('Host received participants update:', payload)
      loadParticipants()
    })

    const responsesSubscription = ResponsesService.subscribeToResponses(sessionId, (payload) => {
      console.log('🎯 Host received response update:', payload)
      const payloadQuestionId = payload.new?.question_id || payload.old?.question_id || currentQuestion?.id
      loadResponses(payloadQuestionId)
    })

    return () => {
      console.log('Cleaning up host subscriptions')
      sessionSubscription?.unsubscribe()
      participantsSubscription?.unsubscribe()
      responsesSubscription?.unsubscribe()
    }
  }, [sessionId, loadSession, loadParticipants, loadResponses, currentQuestion?.id])

  useEffect(() => {
    const activeQuestionId = currentQuestion?.id
    if (!sessionId || !activeQuestionId) return

    console.log('Subscribing to question-specific responses for question:', activeQuestionId)

    const questionResponsesSubscription = ResponsesService.subscribeToQuestionResponses(
      sessionId,
      activeQuestionId,
      (payload) => {
        console.log('Host received question-specific response update:', payload)
        const payloadQuestionId = payload.new?.question_id || payload.old?.question_id || activeQuestionId
        loadResponses(payloadQuestionId)
      }
    )

    return () => {
      console.log('Cleaning up question-specific subscription for question:', activeQuestionId)
      questionResponsesSubscription?.unsubscribe()
    }
  }, [sessionId, currentQuestion?.id, loadResponses])

  // Function to actually start the quiz (called after countdown finishes)
  const actuallyStartQuiz = useCallback(async () => {
    if (!questions.length) {
      setError('No questions available')
      return
    }

    if (!sessionId) {
      setError('Session not found')
      return
    }

    try {
      console.log('Actually starting quiz after countdown...')
      
      // Update session with first question FIRST to notify guests
      console.log('Host updating session with first question:', questions[0].id)
      const { error } = await SessionService.updateCurrentQuestion(sessionId, questions[0].id)
      
      if (error) {
        console.error('Error updating session with first question:', error)
        setError('Failed to update session')
        return
      }
      
      // Update local state after successful database update
      setQuizStarted(true)
      setShowCountdown(false)
      setCurrentQuestionIndex(0)
      setCurrentQuestion(questions[0])
      setTimeLeft(questions[0].time_limit || 30)
      setQuestionActive(true)
      setShowResults(false)
      
      console.log('Session updated successfully - guests should be notified')
      
      // Load responses for the first question
      loadResponses(questions[0].id)
      
      console.log('Quiz started successfully')
    } catch (err) {
      console.error('Error starting quiz:', err)
      setError('Failed to start quiz')
      setShowCountdown(false)
    }
  }, [questions, sessionId, loadResponses])

  // Function to trigger the countdown animation
  const startQuiz = useCallback(() => {
    if (!questions.length) {
      setError('No questions available')
      return
    }
    console.log('Starting countdown animation...')
    setCountdownValue(5)
    setShowCountdown(true)
  }, [questions])

  // Countdown timer effect
  useEffect(() => {
    if (!showCountdown) return
    
    if (countdownValue <= 0) {
      // Countdown finished, actually start the quiz
      actuallyStartQuiz()
      return
    }
    
    const timer = setTimeout(() => {
      setCountdownValue(prev => prev - 1)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [showCountdown, countdownValue, actuallyStartQuiz])

  // Auto-start only if explicitly requested via sessionData.autoStart
  useEffect(() => {
    if (
      sessionData?.autoStart &&
      !autoStartTriggeredRef.current &&
      questions.length > 0 &&
      !quizStarted &&
      !loading
    ) {
      autoStartTriggeredRef.current = true
      startQuiz()
    }
  }, [sessionData?.autoStart, questions.length, quizStarted, loading, startQuiz])

  const nextQuestion = async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      // Quiz is finished
      endQuiz()
      return
    }

    if (!sessionId) {
      setError('Session not found')
      return
    }

    try {
      const nextIndex = currentQuestionIndex + 1
      const nextQuestion = questions[nextIndex]
      
      console.log('Moving to next question:', nextIndex + 1)
      
      // Update session with next question FIRST to notify guests
      console.log('Host updating session with next question:', nextQuestion.id)
      console.log('Host session ID:', sessionId)
      const { error } = await SessionService.updateCurrentQuestion(sessionId, nextQuestion.id)
      
      if (error) {
        console.error('Error updating session with next question:', error)
        setError('Failed to update session')
        return
      } else {
        console.log('Host successfully updated session with next question:', nextQuestion.id)
      }
      
      // Update local state after successful database update
      setCurrentQuestionIndex(nextIndex)
      setCurrentQuestion(nextQuestion)
      setTimeLeft(nextQuestion.time_limit || 30)
      setQuestionActive(true)
      setShowResults(false)
      setResponses([])
      
      // Don't automatically load responses - let the useEffect handle it
      console.log('Question state updated, responses will be loaded by useEffect')
      
      console.log('Successfully moved to question:', nextIndex + 1, 'Guests should be notified')
    } catch (err) {
      console.error('Error moving to next question:', err)
      setError('Failed to move to next question')
    }
  }

  const endQuiz = async () => {
    try {
      console.log('Ending quiz...')
      setQuizEnded(true)
      setQuestionActive(false)
      setShowResults(false)
      
      // End the session
      const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
      await SessionService.endSession(sessionId)
      
      console.log('Quiz ended successfully')
    } catch (err) {
      console.error('Error ending quiz:', err)
      setError('Failed to end quiz')
    }
  }

  const handleEndSession = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to end this session?\n\n' +
      'This will:\n' +
      '• Remove all participants from the session\n' +
      '• Delete all responses and data\n' +
      '• End the session permanently\n\n' +
      'This action cannot be undone.'
    )
    
    if (!confirmed) return
    
    try {
      console.log('Host ending session...')
      setLoading(true)
      
      const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
      console.log('Cleaning up session:', sessionId)
      
      // Clean up responses first
      console.log('Cleaning up session responses...')
      await ResponsesService.deleteSessionResponses(sessionId)
      
      // Then clean up the session (deletes participants and session)
      const { error } = await SessionService.cleanupSession(sessionId)
      
      if (error) {
        console.error('Error cleaning up session:', error)
        setError('Failed to end session')
        alert('❌ Failed to end session. Please try again.')
      } else {
        console.log('Session ended successfully - all participants disconnected')
        alert('✅ Session ended successfully!\n\nAll participants have been disconnected and the session has been deleted.')
        
        // Navigate back to dashboard
        onNavigate('dashboard')
      }
    } catch (err) {
      console.error('Error ending session:', err)
      setError('Failed to end session')
      alert('❌ Failed to end session. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showQuestionResults = () => {
    setShowResults(true)
    setQuestionActive(false)
    loadResponses(currentQuestion?.id)
  }

  // Load responses when current question changes (but don't reset timer)
  useEffect(() => {
    if (currentQuestion && quizStarted) {
      console.log('Current question changed, loading responses for:', currentQuestion.id)
      loadResponses(currentQuestion.id)
    }
  }, [currentQuestion, quizStarted, loadResponses])

  // Timer effect - only run when question is active and timer is running
  useEffect(() => {
    if (timeLeft > 0 && questionActive) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && questionActive) {
      // Time's up, show results
      showQuestionResults()
    }
  }, [timeLeft, questionActive])

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
            onClick={() => onNavigate('dashboard')}
            className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (quizEnded) {
    const sortedParticipants = [...participants].sort((a, b) => (b.score || 0) - (a.score || 0))
    
    return (
      <div
        className="relative min-h-screen overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${bgSession})` }}
      >
        <div className="relative px-4 md:px-8 py-8 min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/90 via-white/85 to-amber-50/80 p-8 md:p-10 text-center shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            {/* Trophy Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="mb-6 text-7xl"
            >
              🏆
            </motion.div>

            {/* Title Banner */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full blur-sm"></div>
                <div className="relative rounded-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300/60 px-8 py-3 shadow-lg">
                  <h1 
                    className="text-2xl md:text-3xl font-bold text-[#2a1940] tracking-wide"
                    style={{ fontFamily: "'Pacifico', 'Brush Script MT', cursive", fontStyle: 'italic' }}
                  >
                    {quiz?.title || 'Quiz'} Completed!
                  </h1>
                </div>
              </div>
            </div>

            <p className="mb-8 text-[#2a1940]/70 text-lg">Thank you for hosting! Here are the final results:</p>
            
            {/* Leaderboard */}
            <div className="mb-8">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2 shadow-lg">
                  <span className="text-white font-bold text-lg">🎖️ Final Leaderboard</span>
                </div>
              </div>

              {/* Top 3 Podium */}
              {sortedParticipants.length > 0 && (
                <div className="flex justify-center items-end gap-4 mb-6">
                  {/* 2nd Place */}
                  {sortedParticipants[1] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-2">
                        🥈
                      </div>
                      <div className="bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg w-20 h-16 flex items-end justify-center pb-2">
                        <span className="text-white font-bold text-sm truncate px-1">{sortedParticipants[1].nickname || 'Anonymous'}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#2a1940]">{sortedParticipants[1].score || 0} pts</div>
                    </motion.div>
                  )}

                  {/* 1st Place */}
                  {sortedParticipants[0] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-2 ring-4 ring-yellow-200">
                        🥇
                      </div>
                      <div className="bg-gradient-to-t from-amber-500 to-yellow-400 rounded-t-lg w-24 h-24 flex items-end justify-center pb-2">
                        <span className="text-white font-bold text-sm truncate px-1">{sortedParticipants[0].nickname || 'Anonymous'}</span>
                      </div>
                      <div className="text-base font-bold text-[#2a1940]">{sortedParticipants[0].score || 0} pts</div>
                    </motion.div>
                  )}

                  {/* 3rd Place */}
                  {sortedParticipants[2] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg mb-2">
                        🥉
                      </div>
                      <div className="bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg w-18 h-12 flex items-end justify-center pb-2">
                        <span className="text-white font-bold text-xs truncate px-1">{sortedParticipants[2].nickname || 'Anonymous'}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#2a1940]">{sortedParticipants[2].score || 0} pts</div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Rest of participants */}
              {sortedParticipants.length > 3 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sortedParticipants.slice(3).map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-white/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-sm">
                          {index + 4}
                        </div>
                        <span className="font-medium text-[#2a1940]">{participant.nickname || 'Anonymous'}</span>
                      </div>
                      <div className="font-bold text-[#2a1940]">{participant.score || 0} pts</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {sortedParticipants.length === 0 && (
                <p className="text-[#2a1940]/60">No participants joined this session</p>
              )}
            </div>

            {/* Back Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('dashboard')}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-lg font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-200"
            >
              🏠 Back to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${bgSession})` }}
    >
      <div className="relative px-4 md:px-8 lg:px-16 py-6 min-h-screen flex flex-col">
        <div className="relative mx-auto max-w-7xl w-full flex-1 flex flex-col">
          {/* Header - Only Right Side */}
          <div className="mb-4 flex items-center justify-end">
            <div className="flex items-center gap-4">
              <div className="text-sm text-white drop-shadow">
                Participants: {activeParticipants.length}
                {participants.length !== activeParticipants.length && (
                  <span className="ml-1 text-xs text-white/80">
                    ({participants.length} total)
                  </span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEndSession}
                className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                End Session
              </motion.button>
            </div>
          </div>

          <div className="relative flex justify-center items-center flex-1 py-8">
            {/* Quiz Control - Centered Block */}
            <div className="w-full max-w-4xl lg:mr-48">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
              >
                {!quizStarted ? (
                  <div className="relative py-6">
                    {/* Quiz Title Banner - Top Center */}
                    <div className="flex justify-center mb-6">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full blur-sm"></div>
                        <div className="relative rounded-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300/60 px-8 py-2.5 shadow-lg">
                          <h1 
                            className="text-xl font-bold text-[#2a1940] tracking-wide"
                            style={{ fontFamily: "'Pacifico', 'Brush Script MT', cursive", fontStyle: 'italic' }}
                          >
                            {quiz?.title || 'Quiz'}
                          </h1>
                        </div>
                      </motion.div>
                    </div>

                    {/* Question Number Badge - Absolute Top Right */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute -top-2 -right-2 z-10"
                    >
                      <div className="rounded-lg bg-yellow-300 px-4 py-1.5 shadow-md border border-yellow-400/50">
                        <span className="text-sm font-bold text-[#2a1940]">1 of {questions.length}</span>
                      </div>
                    </motion.div>

                    {/* Question Card */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      className="relative mx-auto max-w-lg"
                    >
                      <div className="rounded-xl bg-white/95 px-6 py-8 text-center shadow-xl backdrop-blur-sm border border-white/50">
                        <h2 className="text-xl font-bold leading-relaxed text-[#2a1940] md:text-2xl">
                          {questions[0]?.text || 'Get ready for the first question!'}
                        </h2>
                        {questions[0]?.image_url && (
                          <img
                            src={questions[0].image_url}
                            alt="Question"
                            className="mx-auto mt-5 max-h-40 rounded-lg object-cover shadow-md"
                          />
                        )}
                      </div>

                      {/* Countdown Pill or Start Button - Below Question Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center mt-4 gap-3"
                      >
                        <AnimatePresence mode="wait">
                          {showCountdown ? (
                            <motion.div
                              key={countdownValue}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 1.1, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="rounded-full bg-yellow-300 px-5 py-1.5 shadow-md border border-yellow-400/50"
                            >
                              <span className="text-sm font-semibold text-[#2a1940]">
                                {countdownValue} sec left..
                              </span>
                            </motion.div>
                          ) : (
                            <motion.button
                              key="start-button"
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.9, opacity: 0 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={startQuiz}
                              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-lg font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 border-2 border-emerald-400/50"
                            >
                              🚀 Start Quiz
                            </motion.button>
                          )}
                        </AnimatePresence>
                        
                        {/* Waiting message when not started */}
                        {!showCountdown && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-emerald-600/80"
                          >
                            Click to begin the countdown
                          </motion.p>
                        )}
                      </motion.div>
                    </motion.div>

                    {/* Session Code - Small text at bottom */}
                    <p className="mt-6 text-center text-sm text-emerald-600/80">
                      Session code: {sessionData.session ? sessionData.session.code : sessionData.code}
                    </p>
                  </div>
                ) : questionActive ? (
                <div className="relative py-6">
                  {/* Quiz Title Banner - Top Center */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full blur-sm"></div>
                      <div className="relative rounded-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300/60 px-10 py-3 shadow-lg">
                        <h1 
                          className="text-2xl md:text-3xl font-bold text-[#2a1940] tracking-wide"
                          style={{ fontFamily: "'Pacifico', 'Brush Script MT', cursive", fontStyle: 'italic' }}
                        >
                          {quiz?.title || 'Quiz'}
                        </h1>
                      </div>
                    </motion.div>
                  </div>

                  {/* Question Number Badge - Top Right */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute top-4 right-0 z-10"
                  >
                    <div className="rounded-lg bg-yellow-300 px-5 py-2.5 shadow-md border border-yellow-400/50">
                      <span className="text-lg font-bold text-[#2a1940]">{currentQuestionIndex + 1} of {questions.length}</span>
                    </div>
                  </motion.div>

                  {/* Question Text - BIGGER */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                  >
                    <p className="text-xl md:text-2xl text-[#2a1940] font-semibold leading-relaxed">
                      {currentQuestion?.text}
                    </p>
                  </motion.div>

                  {/* Question Image - Centered */}
                  {currentQuestion?.image_url && (
                    <div className="flex justify-center mb-8">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                      >
                        <img
                          src={currentQuestion.image_url}
                          alt="Question"
                          className="max-h-56 md:max-h-64 rounded-xl shadow-xl object-cover border-4 border-white/80"
                        />
                      </motion.div>
                    </div>
                  )}

                  {/* Answer Options - 2x2 Grid with Colors - BIGGER */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {currentQuestion?.answers?.map((answer, index) => {
                      const answerColors = [
                        'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600', // Red
                        'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600', // Blue
                        'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600', // Yellow
                        'bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600', // Green
                      ]
                      return (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`${answerColors[index % 4]} rounded-xl px-5 py-4 text-center shadow-lg cursor-default transition-all duration-200`}
                        >
                          <span className="text-white font-semibold text-base md:text-lg drop-shadow-sm">
                            {answer.text}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Response Counter and Skip Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-base text-[#2a1940]/70">
                      <span className="font-bold text-lg">{responses.length}</span> of <span className="font-bold text-lg">{activeParticipants.length}</span> answered
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextQuestion}
                      className="rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-2.5 text-base font-semibold text-white shadow-lg transition-colors hover:from-orange-500 hover:to-orange-600"
                    >
                      Skip →
                    </motion.button>
                  </div>
                </div>
              ) : showResults ? (
                <div className="relative py-6">
                  {/* Quiz Title Banner - Top Center */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full blur-sm"></div>
                      <div className="relative rounded-full bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-2 border-amber-300/60 px-10 py-3 shadow-lg">
                        <h1 
                          className="text-2xl md:text-3xl font-bold text-[#2a1940] tracking-wide"
                          style={{ fontFamily: "'Pacifico', 'Brush Script MT', cursive", fontStyle: 'italic' }}
                        >
                          {quiz?.title || 'Quiz'}
                        </h1>
                      </div>
                    </motion.div>
                  </div>

                  {/* Question Number Badge - Top Right */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute top-4 right-0 z-10"
                  >
                    <div className="rounded-lg bg-yellow-300 px-5 py-2.5 shadow-md border border-yellow-400/50">
                      <span className="text-lg font-bold text-[#2a1940]">{currentQuestionIndex + 1} of {questions.length}</span>
                    </div>
                  </motion.div>

                  {/* Results Badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="rounded-full bg-gradient-to-r from-emerald-400 to-green-500 px-6 py-2 shadow-lg">
                      <span className="text-white font-bold text-lg">⏱️ Time's Up! - Results</span>
                    </div>
                  </motion.div>

                  {/* Question Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                  >
                    <p className="text-xl md:text-2xl text-[#2a1940] font-semibold leading-relaxed">
                      {currentQuestion?.text}
                    </p>
                  </motion.div>

                  {/* Answer Options - 2x2 Grid with Colors showing correct/incorrect */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {currentQuestion?.answers?.map((answer, index) => {
                      const baseColors = [
                        { bg: 'from-red-400 to-red-500', correct: 'from-emerald-400 to-green-500 ring-4 ring-emerald-300' },
                        { bg: 'from-blue-400 to-blue-500', correct: 'from-emerald-400 to-green-500 ring-4 ring-emerald-300' },
                        { bg: 'from-amber-400 to-yellow-500', correct: 'from-emerald-400 to-green-500 ring-4 ring-emerald-300' },
                        { bg: 'from-emerald-400 to-green-500', correct: 'from-emerald-400 to-green-500 ring-4 ring-emerald-300' },
                      ]
                      const colorSet = baseColors[index % 4]
                      const bgClass = answer.is_correct 
                        ? `bg-gradient-to-r ${colorSet.correct}` 
                        : `bg-gradient-to-r ${colorSet.bg} opacity-50`
                      
                      return (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`${bgClass} rounded-xl px-5 py-4 text-center shadow-lg transition-all duration-200 relative`}
                        >
                          <span className="text-white font-semibold text-base md:text-lg drop-shadow-sm">
                            {answer.text}
                          </span>
                          {answer.is_correct && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                            >
                              <span className="text-emerald-500 text-xl">✓</span>
                            </motion.div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-center gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextQuestion}
                      className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-lg font-bold text-white shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-all duration-200"
                    >
                      {currentQuestionIndex >= questions.length - 1 ? '🏆 Finish Quiz' : '➡️ Next Question'}
                    </motion.button>
                  </div>

                  {/* Waiting message */}
                  {responses.length < activeParticipants.length && activeParticipants.length > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-4 text-center text-sm text-[#2a1940]/70"
                    >
                      {responses.length} of {activeParticipants.length} participants answered
                    </motion.p>
                  )}
                </div>
              ) : null}
            </motion.div>
          </div>

            {/* Timer Block - Floating Right Side (only visible when quiz is active) */}
            {quizStarted && questionActive && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2"
              >
                <div className="rounded-[2rem] border border-white/20 bg-gradient-to-br from-slate-100/90 via-white/80 to-amber-50/70 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
                  <div className="text-center mb-4">
                    <span className="text-sm font-semibold text-[#2a1940]/70 uppercase tracking-wider">Time Left</span>
                  </div>
                  <motion.div
                    key={timeLeft}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center justify-center w-32 h-32 rounded-2xl shadow-xl font-bold text-6xl ${
                      timeLeft <= 10 
                        ? 'bg-gradient-to-br from-red-400 to-red-500 text-white' 
                        : 'bg-gradient-to-br from-amber-200 to-amber-300 text-[#2a1940]'
                    }`}
                  >
                    {timeLeft}
                  </motion.div>
                  <div className="text-center mt-4">
                    <span className="text-xs text-[#2a1940]/60">seconds</span>
                  </div>
                </div>
              </motion.div>
            )}
        </div>
      </div>
    </div>
    </div>
  )
}
