import { useState, useEffect } from 'react'
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

  useEffect(() => {
    console.log('QuizHostControlPage: sessionData received:', sessionData)
    console.log('QuizHostControlPage: sessionData type:', typeof sessionData)
    console.log('QuizHostControlPage: sessionData keys:', sessionData ? Object.keys(sessionData) : 'null')
    
    if (sessionData && sessionData.session) {
      loadSession()
      subscribeToUpdates()
    } else if (sessionData && sessionData.id) {
      // Handle case where sessionData is the session object directly
      console.log('QuizHostControlPage: sessionData is session object directly')
      // Use the session object directly
      loadSession()
      subscribeToUpdates()
    } else {
      console.error('QuizHostControlPage: No sessionData or session found')
      setError('No session data available')
      setLoading(false)
    }
  }, [sessionData])

  const loadSession = async () => {
    try {
      // Handle both sessionData.session.id and sessionData.id cases
      const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
      console.log('Loading session for host control:', sessionId)
      const { data, error } = await SessionService.getSession(sessionId)
      if (error) {
        console.error('Error loading session:', error)
        setError('Failed to load session')
      } else {
        console.log('Session loaded for host:', data)
        setSession(data)
        
        // Load quiz with questions
        if (data.quiz_id) {
          await loadQuiz(data.quiz_id)
        }
        
        // Load participants
        await loadParticipants()
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
  }

  const loadParticipants = async () => {
    const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
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
  }

  const subscribeToUpdates = () => {
    const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
    if (!sessionId) return

    console.log('Setting up real-time subscription for host session:', sessionId)
    
    // Subscribe to session updates (to ensure host stays in sync)
    const sessionSubscription = SessionService.subscribeToSession(sessionId, (payload) => {
      console.log('Host received session update:', payload)
      // Reload session data to stay in sync
      loadSession()
    })

    // Subscribe to participants joining
    const participantsSubscription = SessionService.subscribeToParticipants(sessionId, (payload) => {
      console.log('Host received participants update:', payload)
      loadParticipants()
    })

    // Subscribe to responses using the new ResponsesService with real-time updates
    const responsesSubscription = ResponsesService.subscribeToResponses(sessionId, (payload) => {
      console.log('🎯 Host received response update:', payload)
      console.log('⚡ Host: Real-time response update received, reloading responses immediately')
      console.log('📊 Event type:', payload.eventType)
      console.log('🆔 Session ID:', payload.new?.session_id || payload.old?.session_id)
      console.log('❓ Question ID:', payload.new?.question_id || payload.old?.question_id)
      console.log('🔄 Host: About to reload responses due to real-time update')
      // Immediately reload responses when we get a real-time update
      loadResponses()
    })

    console.log('🔗 Host: Real-time subscription set up for session:', sessionId)

    // Subscribe to responses for the current question specifically
    let questionResponsesSubscription = null
    if (currentQuestion) {
      questionResponsesSubscription = ResponsesService.subscribeToQuestionResponses(sessionId, currentQuestion.id, (payload) => {
        console.log('Host received question-specific response update:', payload)
        console.log('Host: Real-time question response update received, reloading responses immediately')
        loadResponses()
      })
    }

    // No periodic checks - rely purely on real-time database changes

    return () => {
      console.log('Cleaning up host subscriptions')
      sessionSubscription?.unsubscribe()
      participantsSubscription?.unsubscribe()
      responsesSubscription?.unsubscribe()
      questionResponsesSubscription?.unsubscribe()
    }
  }

  const loadResponses = async () => {
    const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
    if (!sessionId || !currentQuestion) {
      console.log('loadResponses: Missing sessionId or currentQuestion', { sessionId, currentQuestion })
      return
    }

    try {
      console.log('Host loading responses for question:', currentQuestion.id)
      console.log('Host session info:', { sessionId, participantsCount: participants.length })
      
      // Get responses for current question
      const { data, error } = await SessionService.getQuestionResponses(sessionId, currentQuestion.id)
      console.log('Host responses loaded:', { 
        data, 
        error, 
        count: data?.length || 0, 
        participants: participants.length,
        questionId: currentQuestion.id 
      })
      
      if (!error) {
        const previousCount = responses.length
        const newCount = data?.length || 0
        
        setResponses(data || [])
        
        // Show count change feedback
        if (newCount !== previousCount) {
          console.log(`📈 Response count updated: ${previousCount} → ${newCount}`)
          console.log(`👥 Participants: ${participants.length}, Responses: ${newCount}`)
          console.log('🔄 UI should update now with new response count')
        } else {
          console.log(`📊 Response count unchanged: ${newCount} (participants: ${participants.length})`)
        }
        
        // Log response details for debugging
        if (data && data.length > 0) {
          console.log('📋 Response details:', data.map(r => ({
            responseId: r.id,
            participantId: r.participant_id,
            sessionParticipantId: r.session_participants?.id,
            nickname: r.session_participants?.nickname,
            answerId: r.answer_id,
            isCorrect: r.is_correct,
            hasParticipantData: !!r.session_participants
          })))
        } else {
          console.log('📭 No responses found for question:', currentQuestion.id)
        }
        
        // Check if all participants have answered (but don't auto-advance)
        if (data && data.length >= participants.length && participants.length > 0) {
          console.log('✅ All participants have answered - host can manually advance')
        }
      } else {
        console.error('❌ Error loading responses:', error)
      }
    } catch (err) {
      console.error('Error loading responses:', err)
    }
  }

  const startQuiz = async () => {
    if (!questions.length) {
      setError('No questions available')
      return
    }

    try {
      console.log('Starting quiz...')
      
      // Update session with first question FIRST to notify guests
      const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
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
      loadResponses()
      
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

    try {
      const nextIndex = currentQuestionIndex + 1
      const nextQuestion = questions[nextIndex]
      
      console.log('Moving to next question:', nextIndex + 1)
      
      // Update session with next question FIRST to notify guests
      const sessionId = sessionData.session ? sessionData.session.id : sessionData.id
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
    loadResponses()
  }

  // Load responses when current question changes (but don't reset timer)
  useEffect(() => {
    if (currentQuestion && quizStarted) {
      console.log('Current question changed, loading responses for:', currentQuestion.id)
      loadResponses()
    }
  }, [currentQuestion, quizStarted])

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
            onClick={() => onNavigate('dashboard')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Dashboard
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
            <p className="text-gray-600 mb-6">Thank you for hosting the quiz session</p>
            
            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Final Leaderboard</h3>
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
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {quiz?.title || 'Quiz Host Control'}
            </h1>
            <p className="text-purple-200">Session Code: {sessionData.session ? sessionData.session.code : sessionData.code}</p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">Participants: {participants.length}</div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEndSession}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              End Session
            </motion.button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quiz Control */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              {!quizStarted ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Ready to Start?</h2>
                  <p className="text-gray-600 mb-6">
                    {questions.length} questions ready • {participants.length} participants joined
                  </p>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startQuiz}
                    disabled={participants.length === 0}
                    className="bg-green-600 text-white px-8 py-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {participants.length === 0 ? 'Waiting for Participants...' : 'Start Quiz'}
                  </motion.button>
                </div>
              ) : questionActive ? (
                <div>
                  {/* Timer and Controls */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-gray-600">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-purple-600'}`}>
                        {timeLeft}s
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                      >
                        Skip Question
                      </motion.button>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      {currentQuestion?.text}
                    </h2>
                    {currentQuestion?.image_url && (
                      <img
                        src={currentQuestion.image_url}
                        alt="Question"
                        className="max-h-64 mx-auto rounded-lg shadow-lg"
                      />
                    )}
                  </div>

                  {/* Answers */}
                  <div className="space-y-3">
                    {currentQuestion?.answers?.map((answer, index) => (
                      <div
                        key={answer.id}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-4 bg-gray-400">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-gray-800">{answer.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-gray-600 mb-4">
                      {responses.length} of {participants.length} participants answered
                    </p>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={nextQuestion}
                      className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    >
                      Skip Question
                    </motion.button>
                  </div>
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
                    <div className="flex justify-center space-x-4 mb-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        disabled={responses.length < participants.length && participants.length > 0}
                        className={`px-6 py-3 rounded-lg transition-colors ${
                          responses.length >= participants.length && participants.length > 0
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                      >
                        {currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={nextQuestion}
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        {currentQuestionIndex >= questions.length - 1 ? 'Finish Quiz' : 'Skip to Next'}
                      </motion.button>
                    </div>
                    
                    {responses.length < participants.length && participants.length > 0 && (
                      <p className="text-sm text-gray-500">
                        Waiting for {participants.length - responses.length} more participant(s) to answer
                        <br />
                        <span className="text-orange-600 font-medium">Or use "Skip to Next" to continue</span>
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
              className="bg-white rounded-2xl p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">Participants ({participants.length})</h3>
              
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-gray-600">No participants yet</p>
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
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                          index === 1 ? 'bg-gray-50 border border-gray-200' :
                          index === 2 ? 'bg-orange-50 border border-orange-200' :
                          'bg-gray-50'
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
