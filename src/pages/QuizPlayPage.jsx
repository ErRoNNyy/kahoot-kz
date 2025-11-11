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
            onClick={handleLeaveSession}
            disabled={leaving}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {leaving ? 'Leaving...' : 'Leave Session'}
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (quizEnded) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl text-center"
          >
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Quiz Completed!</h1>
            <p className="text-gray-600 mb-6">
              Thanks for playing! You can hang tight to celebrate with the host or leave whenever you’re ready.
            </p>
            
            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Final Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard
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
                          {participant.id === participantId && ' (You)'}
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
                onClick={handleLeaveSession}
                disabled={leaving}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {leaving ? 'Leaving...' : 'Leave Session'}
              </motion.button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              If the host starts another round later, just rejoin with the new room code.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (waitingForHost) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 shadow-xl text-center"
          >
            <div className="text-6xl mb-6">⏳</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Waiting for Host</h1>
            <p className="text-gray-600 mb-6">The host will start the quiz soon</p>
            
            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Room Code</p>
                <div className="text-3xl font-bold text-purple-600 font-mono">
                  {sessionData.session ? sessionData.session.code : sessionData.code}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 mb-4">Waiting for quiz to start...</p>
              <div className="flex justify-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('Guest manually refreshing session...')
                    loadSession()
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Refresh Session
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLeaveSession}
                  disabled={leaving}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {quiz?.title || 'Quiz Session'}
            </h1>
            <p className="text-purple-200">Session Code: {sessionData.session ? sessionData.session.code : sessionData.code}</p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">Participants: {participants.length}</div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLeaveSession}
              disabled={leaving}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {leaving ? 'Leaving...' : 'Leave Session'}
            </motion.button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Question Area */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              {currentQuestion && questionActive && !showResults ? (
                <div>
                  {/* Timer */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-gray-600">Question Time</div>
                    <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-purple-600'}`}>
                      {timeLeft}s
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      {currentQuestion.text}
                    </h2>
                    {currentQuestion.image_url && (
                      <img
                        src={currentQuestion.image_url}
                        alt="Question"
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
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
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${answerSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${
                              selectedAnswer?.id === answer.id ? 'bg-purple-600' : 'bg-gray-400'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-gray-800">{answer.text}</span>
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
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${answerSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${
                              selectedAnswer?.id === answer.id ? 'bg-purple-600' : 'bg-gray-400'
                            }`}>
                              {answer.text === 'True' ? 'T' : 'F'}
                            </div>
                            <span className="text-gray-800">{answer.text}</span>
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
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full mt-6 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {answerSubmitted ? 'Answer Submitted' : 'Submit Answer'}
                  </motion.button>
                </div>
              ) : showResults ? (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Question Results</h2>
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      {currentQuestion?.text}
                    </h3>
                    
                    <div className="space-y-3">
                      {currentQuestion?.answers?.map((answer, index) => (
                        <div
                          key={answer.id}
                          className={`p-4 rounded-lg border-2 ${
                            answer.is_correct 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 ${
                              answer.is_correct ? 'bg-green-500' : 'bg-gray-400'
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="text-gray-800">{answer.text}</span>
                            {answer.is_correct && <span className="ml-2 text-green-600 font-bold">✓</span>}
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