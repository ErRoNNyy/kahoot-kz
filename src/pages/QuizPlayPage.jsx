import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SessionService } from '../services/session.js'
import { QuizService } from '../services/quiz.js'

export default function QuizPlayPage({ sessionData, onNavigate }) {
  const [session, setSession] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [participants, setParticipants] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [questionActive, setQuestionActive] = useState(false)
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [quizEnded, setQuizEnded] = useState(false)
  const [waitingForHost, setWaitingForHost] = useState(true)
  const [currentQuestionId, setCurrentQuestionId] = useState(null)
  const [leaving, setLeaving] = useState(false)

  const sessionId = sessionData?.session ? sessionData.session.id : sessionData?.id
  const participantId = sessionData?.participant?.id

  useEffect(() => {
    if (sessionId) {
      loadSession()
      subscribeToUpdates()
    } else {
      setError('No session data available')
      setLoading(false)
    }
  }, [sessionId])

  // Load current question when quiz is loaded
  useEffect(() => {
    if (quiz && currentQuestionId && !waitingForHost) {
      console.log('Participant loading current question:', currentQuestionId)
      loadCurrentQuestion(currentQuestionId)
    }
  }, [quiz, currentQuestionId, waitingForHost])

  // Reset answer state when question changes
  useEffect(() => {
    if (currentQuestion) {
      console.log('Participant question changed, resetting answer state')
      setAnswerSubmitted(false)
      setSelectedAnswer(null)
      setShowResults(false)
    }
  }, [currentQuestion])

  const loadSession = async () => {
    if (!sessionId) return

    try {
      console.log('Loading session for participant:', sessionId)
      const { data, error } = await SessionService.getSession(sessionId)
      if (error) {
        console.error('Error loading session:', error)
        setError('Failed to load session')
      } else {
        console.log('Session loaded for participant:', data)
        setSession(data)
        
        // Load quiz with questions
        if (data.quiz_id) {
          await loadQuiz(data.quiz_id)
        }
        
        // Load participants
        await loadParticipants()
        
        // Check if quiz has started
        if (data.current_question) {
          setWaitingForHost(false)
          setCurrentQuestionId(data.current_question)
        }
      }
    } catch (err) {
      console.error('Error loading session:', err)
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const loadQuiz = async (quizId) => {
    try {
      console.log('QuizPlayPage: Loading quiz with ID:', quizId)
      const { data, error } = await QuizService.getQuizWithQuestions(quizId)
      console.log('QuizPlayPage: Quiz load result:', { data, error })
      
      if (error) {
        console.error('QuizPlayPage: Quiz load error:', error)
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          setError('Quiz not found. The quiz may have been deleted.')
        } else {
          setError('Failed to load quiz')
        }
      } else {
        console.log('QuizPlayPage: Quiz loaded successfully:', data)
        setQuiz(data)
      }
    } catch (err) {
      console.error('QuizPlayPage: Quiz load exception:', err)
      setError('Failed to load quiz')
    }
  }

  const loadCurrentQuestion = async (questionId) => {
    if (!quiz) return

    try {
      console.log('Loading current question for participant:', questionId)
      const question = quiz.questions.find(q => q.id === questionId)
      if (question) {
        console.log('Question loaded for participant:', question)
        setCurrentQuestion(question)
        setTimeLeft(question.time_limit || 30)
        setQuestionActive(true)
        setAnswerSubmitted(false)
        setShowResults(false)
        setSelectedAnswer(null)
        
        // Start the timer for this question
        console.log('Participant: Starting timer for question with', question.time_limit || 30, 'seconds')
      } else {
        console.error('Question not found in quiz:', questionId)
        setError('Question not found')
      }
    } catch (err) {
      console.error('Error loading current question:', err)
      setError('Failed to load question')
    }
  }

  const loadParticipants = async () => {
    if (!sessionId) return

    try {
      console.log('Loading participants for participant session:', sessionId)
      const { data, error } = await SessionService.getLeaderboard(sessionId)
      if (error) {
        console.error('Error loading participants:', error)
      } else {
        console.log('Participants loaded for participant:', data)
        setParticipants(data || [])
        setLeaderboard(data || [])
      }
    } catch (err) {
      console.error('Error loading participants:', err)
    }
  }

  const subscribeToUpdates = () => {
    if (!sessionId) return

    console.log('Setting up real-time subscription for participant session:', sessionId)
    
    // Subscribe to session updates (when host starts quiz or moves to next question)
    const sessionSubscription = SessionService.subscribeToSession(sessionId, (payload) => {
      console.log('Participant received session update:', payload)
      console.log('Participant current question ID:', currentQuestionId)
      console.log('Participant current question object:', currentQuestion)
      
      if (payload.new && payload.new.current_question) {
        // Host started quiz or moved to next question
        console.log('Participant: Host updated current question to:', payload.new.current_question)
        console.log('Participant: Previous question ID was:', currentQuestionId)
        
        setWaitingForHost(false)
        setCurrentQuestionId(payload.new.current_question)
        
        // If we're already on a question and the host moved to a new one, reset our state
        if (currentQuestion && payload.new.current_question !== currentQuestion.id) {
          console.log('Participant: Host moved to different question, resetting state')
          console.log('Participant: Was on question', currentQuestion.id, 'now moving to', payload.new.current_question)
          setAnswerSubmitted(false)
          setSelectedAnswer(null)
          setShowResults(false)
          setQuestionActive(false)
        }
      } else if (payload.new && payload.new.status === 'completed') {
        // Quiz ended
        console.log('Participant: Quiz ended')
        setQuizEnded(true)
        setQuestionActive(false)
        setShowResults(false)
        loadParticipants()
      } else if (payload.eventType === 'DELETE' || !payload.new) {
        // Session was deleted by host
        console.log('Participant: Session was ended by host')
        alert('❌ Session ended by host!\n\nThe quiz session has been ended and you have been disconnected.')
        onNavigate('guest-welcome')
      } else {
        console.log('Participant: Received session update but no relevant changes:', payload)
      }
    })

    // Subscribe to participants joining
    const participantsSubscription = SessionService.subscribeToParticipants(sessionId, (payload) => {
      console.log('Participant received participants update:', payload)
      loadParticipants()
    })

    // Subscribe to responses for leaderboard updates
    const responsesSubscription = SessionService.subscribeToResponses(sessionId, (payload) => {
      console.log('Participant received response update:', payload)
      loadParticipants()
    })

    // Periodic check for session updates (fallback for real-time)
    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: currentSession, error } = await SessionService.getSession(sessionId)
        if (error && error.code === 'PGRST116') {
          // Session not found - host ended the session
          console.log('Participant periodic check - session not found, host ended session')
          clearInterval(sessionCheckInterval)
          alert('❌ Session ended by host!\n\nThe quiz session has been ended and you have been disconnected.')
          onNavigate('guest-welcome')
        } else if (currentSession && currentSession.current_question) {
          if (currentSession.current_question !== currentQuestionId) {
            console.log('Participant periodic check - host moved to new question:', currentSession.current_question)
            setWaitingForHost(false)
            setCurrentQuestionId(currentSession.current_question)

            if (currentQuestion && currentSession.current_question !== currentQuestion.id) {
              console.log('Participant periodic check - resetting state for new question')
              setAnswerSubmitted(false)
              setSelectedAnswer(null)
              setShowResults(false)
              setQuestionActive(false)
            }
          }
        }
      } catch (err) {
        console.error('Error checking session status:', err)
      }
    }, 10000) // Check every 10 seconds

    return () => {
      console.log('Cleaning up participant subscriptions')
      sessionSubscription?.unsubscribe()
      participantsSubscription?.unsubscribe()
      responsesSubscription?.unsubscribe()
      clearInterval(sessionCheckInterval)
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || answerSubmitted) {
      console.log('Submit answer blocked:', { selectedAnswer: !!selectedAnswer, currentQuestion: !!currentQuestion, answerSubmitted })
      return
    }

    try {
      if (!sessionId || !participantId) {
        console.warn('Submit answer aborted - missing session or participant')
        setError('Session not found. Please rejoin.')
        return
      }

      // Handle different question types
      let answerId, isCorrect
      
      if (currentQuestion.question_type === 'Short Answer') {
        // For short answer questions, find the matching answer in the question's answers
        const matchingAnswer = currentQuestion.answers.find(answer => 
          answer.text.toLowerCase().trim() === selectedAnswer.text.toLowerCase().trim()
        )
        
        if (matchingAnswer) {
          answerId = matchingAnswer.id
          isCorrect = matchingAnswer.is_correct
          console.log('Short answer: Found matching answer:', { answerId, isCorrect, text: matchingAnswer.text })
        } else {
          // No exact match found, check for partial matches or create a new answer entry
          console.log('Short answer: No exact match found, checking for partial matches')
          const partialMatch = currentQuestion.answers.find(answer => 
            answer.text.toLowerCase().includes(selectedAnswer.text.toLowerCase()) ||
            selectedAnswer.text.toLowerCase().includes(answer.text.toLowerCase())
          )
          
          if (partialMatch) {
            answerId = partialMatch.id
            isCorrect = partialMatch.is_correct
            console.log('Short answer: Found partial match:', { answerId, isCorrect, text: partialMatch.text })
          } else {
            // Use the first answer as fallback (this shouldn't happen in normal flow)
            answerId = currentQuestion.answers[0]?.id
            isCorrect = false
            console.log('Short answer: Using fallback answer:', { answerId, isCorrect })
          }
        }
      } else {
        // For MCQ and True/False questions, use the selected answer directly
        answerId = selectedAnswer.id
        isCorrect = selectedAnswer.is_correct
      }

      console.log('Guest submitting answer:', {
        sessionId: sessionId,
        participantId: participantId,
        participantData: sessionData.participant,
        questionId: currentQuestion.id,
        questionType: currentQuestion.question_type,
        answerId: answerId,
        isCorrect: isCorrect,
        selectedAnswerText: selectedAnswer.text
      })

      const { data, error } = await SessionService.submitAnswer(
        sessionId,
        participantId,
        currentQuestion.id,
        answerId,
        isCorrect,
        currentQuestion.question_type === 'Short Answer' ? selectedAnswer.text : null
      )

      console.log('Guest submit answer result:', { data, error })

      if (error) {
        console.error('Error submitting answer:', error)
        setError('Failed to submit answer')
      } else {
        console.log('Answer submitted successfully:', data)
        setAnswerSubmitted(true)
        setQuestionActive(false)

        // Refresh leaderboard immediately so guest sees updated score
        await loadParticipants()

        // Show results after a short delay
        setTimeout(() => {
          setShowResults(true)
        }, 1000)
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError('Failed to submit answer')
    }
  }

  const handleLeaveSession = async () => {
    if (!sessionId || !participantId) {
      onNavigate('guest-welcome')
      return
    }

    try {
      setLeaving(true)
      console.log('Guest leaving session:', { sessionId, participantId })
      const { error: leaveError } = await SessionService.leaveSession(sessionId, participantId)

      if (leaveError) {
        console.error('Error leaving session:', leaveError)
        setError('Failed to leave session. Please try again.')
        setLeaving(false)
        return
      }

      setLeaving(false)
      onNavigate('guest-welcome')
    } catch (err) {
      console.error('Exception while leaving session:', err)
      setError('Failed to leave session. Please try again.')
      setLeaving(false)
    }
  }

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && questionActive && !answerSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && questionActive && !answerSubmitted) {
      // Time's up, auto-submit if no answer selected
      if (selectedAnswer) {
        submitAnswer()
      } else {
        setAnswerSubmitted(true)
        setQuestionActive(false)
        setShowResults(true)
      }
    }
  }, [timeLeft, questionActive, answerSubmitted, selectedAnswer])

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
            onClick={handleLeaveSession}
            disabled={leaving}
            className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {leaving ? 'Leaving...' : 'Leave Session'}
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
            <p className="mb-6 text-emerald-600">
              Thanks for playing! You can hang tight to celebrate with the host or leave whenever you’re ready.
            </p>
            
            <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
              <h3 className="mb-4 text-xl font-bold text-emerald-900">Final Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        index === 0 ? 'border-yellow-200 bg-yellow-50' :
                        index === 1 ? 'border-emerald-100/60 bg-white/85' :
                        index === 2 ? 'border-orange-200 bg-orange-50' :
                        'border-emerald-100/60 bg-white/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-emerald-950 ${
                          index === 0 ? 'bg-yellow-400' :
                          index === 1 ? 'bg-emerald-300' :
                          index === 2 ? 'bg-orange-400' :
                          'bg-emerald-200'
                        }`}>
                          {index + 1}
                        </div>
                        <span className="font-medium text-emerald-900">
                          {participant.nickname || 'Anonymous'}
                          {participant.id === participantId && ' (You)'}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-emerald-900">
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
                onClick={handleLeaveSession}
                disabled={leaving}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {leaving ? 'Leaving...' : 'Leave Session'}
              </motion.button>
            </div>
            <p className="mt-4 text-sm text-emerald-600">
              If the host starts another round later, just rejoin with the new room code.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (waitingForHost) {
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
            <div className="mb-6 text-6xl">⏳</div>
            <h1 className="mb-4 text-3xl font-bold text-emerald-900">Waiting for Host</h1>
            <p className="mb-6 text-emerald-600">The host will start the quiz soon</p>
            
            <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
              <div className="text-center">
                <p className="mb-2 text-sm text-emerald-700">Room Code</p>
                <div className="font-mono text-3xl font-bold text-emerald-900 tracking-widest">
                  {sessionData.session ? sessionData.session.code : sessionData.code}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-400 border-t-transparent"></div>
              <p className="mb-4 text-emerald-600">Waiting for quiz to start...</p>
              <div className="flex justify-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('Guest manually refreshing session...')
                    loadSession()
                  }}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                >
                  Refresh Session
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLeaveSession}
                  disabled={leaving}
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {leaving ? 'Leaving...' : 'Leave Session'}
                </motion.button>
              </div>
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
              {quiz?.title || 'Quiz Session'}
            </h1>
            <p className="text-emerald-100">Session Code: {sessionData.session ? sessionData.session.code : sessionData.code}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white">Participants: {participants.length}</div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLeaveSession}
              disabled={leaving}
              className="mt-3 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {leaving ? 'Leaving...' : 'Leave Session'}
            </motion.button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Question Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-6 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
            >
              {currentQuestion && questionActive && !showResults ? (
                <div>
                  {/* Timer */}
                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm text-emerald-600">Question Time</div>
                    <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {timeLeft}s
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h2 className="mb-4 text-2xl font-bold text-emerald-900">
                      {currentQuestion.text}
                    </h2>
                    {currentQuestion.image_url && (
                      <img
                        src={currentQuestion.image_url}
                        alt="Question"
                        className="mx-auto max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                  </div>

                  {/* Answers */}
                  {currentQuestion.question_type === 'MCQ' && (
                    <div className="space-y-3">
                      {currentQuestion.answers.map((answer, index) => (
                        <motion.button
                          key={answer.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAnswer(answer)}
                          disabled={answerSubmitted}
                          className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-emerald-400 bg-emerald-100/60 shadow-[0_10px_25px_-20px_rgba(16,185,129,0.8)]'
                              : 'border-emerald-100/60 bg-white/80 hover:border-emerald-200'
                          } ${answerSubmitted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center">
                            <div className={`mr-4 flex h-8 w-8 items-center justify-center rounded-full font-bold text-emerald-950 ${
                              selectedAnswer?.id === answer.id ? 'bg-emerald-400' : 'bg-emerald-200'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-emerald-900">{answer.text}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.question_type === 'True/False' && (
                    <div className="space-y-3">
                      {currentQuestion.answers.map((answer, index) => (
                        <motion.button
                          key={answer.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedAnswer(answer)}
                          disabled={answerSubmitted}
                          className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-emerald-400 bg-emerald-100/60 shadow-[0_10px_25px_-20px_rgba(16,185,129,0.8)]'
                              : 'border-emerald-100/60 bg-white/80 hover:border-emerald-200'
                          } ${answerSubmitted ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center">
                            <div className={`mr-4 flex h-8 w-8 items-center justify-center rounded-full font-bold text-emerald-950 ${
                              selectedAnswer?.id === answer.id ? 'bg-emerald-400' : 'bg-emerald-200'
                            }`}>
                              {answer.text === 'True' ? 'T' : 'F'}
                            </div>
                            <span className="text-emerald-900">{answer.text}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.question_type === 'Short Answer' && (
                    <div>
                      <textarea
                        value={selectedAnswer?.text || ''}
                        onChange={(e) => setSelectedAnswer({ 
                          id: 'short-answer', 
                          text: e.target.value, 
                          is_correct: false 
                        })}
                        disabled={answerSubmitted}
                        className="w-full rounded-xl border border-emerald-200/60 bg-white/85 p-4 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type your answer here..."
                        rows={4}
                      />
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || answerSubmitted}
                    className="mt-6 w-full rounded-full bg-emerald-500 py-3 px-4 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {answerSubmitted ? 'Answer Submitted' : 'Submit Answer'}
                  </motion.button>
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
                    <p className="text-gray-600">Waiting for next question...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting for Question</h2>
                  <p className="text-gray-600">The host will start the quiz soon</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Leaderboard</h3>
              
              {leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="text-gray-600">No scores yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          participant?.is_active === false || participant?.left_at
                            ? 'bg-gray-100 border-gray-200 opacity-70'
                            : index === 0
                              ? 'bg-yellow-50 border-yellow-200'
                              : index === 1
                                ? 'bg-gray-50 border-gray-200'
                                : index === 2
                                  ? 'bg-orange-50 border-orange-200'
                                  : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                            index === 0 ? 'bg-yellow-500' :
                            index === 1 ? 'bg-gray-400' :
                            index === 2 ? 'bg-orange-500' :
                            'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-800">
                            {participant.nickname || 'Anonymous'}
                            {participant.id === sessionData.participant.id && ' (You)'}
                            {(participant?.is_active === false || participant?.left_at) && ' (Left)'}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-800">
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