import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { SessionService } from '../services/session.js'
import { ResponsesService } from '../services/responses.js'

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

  const startQuiz = async () => {
    if (!questions.length) {
      setError('No questions available')
      return
    }

    if (!sessionId) {
      setError('Session not found')
      return
    }

    try {
      console.log('Starting quiz...')
      
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
    }
  }

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
            <h1 className="mb-4 text-3xl font-bold text-emerald-900">Quiz Completed!</h1>
            <p className="mb-6 text-emerald-600">Thank you for hosting the quiz session</p>
            
            <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
              <h3 className="mb-4 text-xl font-bold text-emerald-900">Final Leaderboard</h3>
              <div className="space-y-3">
                {participants
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                        index === 1 ? 'bg-gray-50 border border-gray-200' :
                        index === 2 ? 'bg-orange-50 border border-orange-200' :
                        'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' :
                          'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-gray-800">
                          {participant.nickname || 'Anonymous'}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {participant.score || 0} points
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('dashboard')}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>
      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white">
              {quiz?.title || 'Quiz Host Control'}
            </h1>
            <p className="text-emerald-100">Session Code: {sessionData.session ? sessionData.session.code : sessionData.code}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">
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
              className="mt-3 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
            >
              End Session
            </motion.button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quiz Control */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-6 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
            >
              {!quizStarted ? (
                <div className="py-8 text-center">
                  <div className="mb-4 text-6xl">🎯</div>
                  <h2 className="mb-2 text-2xl font-bold text-emerald-900">Ready to Start?</h2>
                  <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-100/70 px-6 py-2 text-base font-semibold tracking-widest text-emerald-800 shadow-sm">
                    Session Code:&nbsp;
                    <span className="font-bold text-emerald-900">
                      {sessionData.session ? sessionData.session.code : sessionData.code}
                    </span>
                  </div>
                  <p className="mb-6 text-emerald-600">
                    {questions.length} questions ready • {activeParticipants.length} active participant
                    {activeParticipants.length === 1 ? '' : 's'}
                    {participants.length !== activeParticipants.length && (
                      <span className="ml-1 text-xs text-emerald-500">
                        ({participants.length} total)
                      </span>
                    )}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startQuiz}
                    disabled={activeParticipants.length === 0}
                    className="rounded-full bg-emerald-500 px-8 py-4 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activeParticipants.length === 0 ? 'Waiting for Participants...' : 'Start Quiz'}
                  </motion.button>
                </div>
              ) : questionActive ? (
                <div>
                  {/* Timer and Controls */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm text-emerald-600">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {timeLeft}s
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                      >
                        Skip Question
                      </motion.button>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h2 className="mb-4 text-2xl font-bold text-emerald-900">
                      {currentQuestion?.text}
                    </h2>
                    {currentQuestion?.image_url && (
                      <img
                        src={currentQuestion.image_url}
                        alt="Question"
                        className="mx-auto max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                  </div>

                  {/* Answers */}
                  <div className="space-y-3">
                    {currentQuestion?.answers?.map((answer, index) => (
                      <div
                        key={answer.id}
                        className="rounded-lg border-2 border-emerald-100/60 bg-white/80 p-4"
                      >
                        <div className="flex items-center">
                          <div className="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 font-bold text-emerald-950">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-emerald-900">{answer.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <p className="mb-4 text-emerald-600">
                      {responses.length} of {activeParticipants.length} participants answered
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextQuestion}
                      className="rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                    >
                      Skip Question
                    </motion.button>
                  </div>
                </div>
              ) : showResults ? (
                <div>
                  <h2 className="mb-6 text-2xl font-bold text-emerald-900">Question Results</h2>
                  
                  <div className="mb-6">
                    <h3 className="mb-4 text-lg font-semibold text-emerald-800">
                      {currentQuestion?.text}
                    </h3>
                    
                    <div className="space-y-3">
                      {currentQuestion?.answers?.map((answer, index) => (
                        <div
                          key={answer.id}
                          className={`rounded-lg border-2 p-4 ${
                            answer.is_correct 
                              ? 'border-emerald-300 bg-emerald-100/60' 
                              : 'border-emerald-100/60 bg-white/80'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`mr-4 flex h-8 w-8 items-center justify-center rounded-full font-bold text-emerald-950 ${
                              answer.is_correct ? 'bg-emerald-400' : 'bg-emerald-200'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-emerald-900">{answer.text}</span>
                            {answer.is_correct && <span className="ml-2 font-bold text-emerald-600">✓</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mb-4 flex justify-center space-x-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        disabled={responses.length < activeParticipants.length && activeParticipants.length > 0}
                        className={`px-6 py-3 rounded-full transition-colors ${
                          responses.length >= activeParticipants.length && activeParticipants.length > 0
                            ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                            : 'bg-emerald-200 text-emerald-600 cursor-not-allowed'
                        }`}
                      >
                        {currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        className="rounded-full bg-orange-500 px-6 py-3 text-white transition-colors hover:bg-orange-600"
                      >
                        {currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Skip to Next'}
                      </motion.button>
                    </div>
                    
                    {responses.length < activeParticipants.length && activeParticipants.length > 0 && (
                      <p className="text-sm text-emerald-600">
                        Waiting for {activeParticipants.length - responses.length} more participant(s) to answer
                        <br />
                        <span className="font-medium text-orange-500">Or use "Skip to Next" to continue</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>

          {/* Participants & Leaderboard */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-6 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
            >
              <h3 className="mb-4 text-xl font-bold text-emerald-900">
                Participants ({activeParticipants.length})
                {participants.length !== activeParticipants.length && (
                  <span className="ml-2 text-sm text-emerald-500">
                    {participants.length - activeParticipants.length} left
                  </span>
                )}
              </h3>
              
              {participants.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="mb-2 text-4xl">👥</div>
                  <p className="text-emerald-600">No participants yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          participant?.is_active === false || participant?.left_at
                            ? 'border-emerald-100/60 bg-emerald-50/60 opacity-70'
                            : index === 0
                              ? 'border-yellow-200 bg-yellow-50'
                              : index === 1
                                ? 'border-emerald-100/60 bg-white/80'
                                : index === 2
                                  ? 'border-orange-200 bg-orange-50'
                                  : 'border-emerald-100/60 bg-white/80'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full font-bold text-emerald-950 ${
                            index === 0 ? 'bg-yellow-400' :
                            index === 1 ? 'bg-emerald-300' :
                            index === 2 ? 'bg-orange-400' :
                            'bg-emerald-200'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-emerald-900">
                            {participant.nickname || 'Anonymous'}
                            {(participant?.is_active === false || participant?.left_at) && (
                              <span className="ml-2 text-xs uppercase tracking-wide text-emerald-500">Left</span>
                            )}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-emerald-900">
                          {participant.score || 0}
                        </div>
                      </motion.div>
                    ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
