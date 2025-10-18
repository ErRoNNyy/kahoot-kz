import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SessionService } from '../services/session.js'
import { QuizService } from '../services/quiz.js'

export default function QuizPlayPage({ sessionData, onNavigate }) {
  const [session, setSession] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [participants, setParticipants] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionData) {
      loadSession()
      subscribeToUpdates()
    }
  }, [sessionData])

  const loadSession = async () => {
    try {
      const { data, error } = await SessionService.getSession(sessionData.session.id)
      if (error) {
        setError('Failed to load session')
      } else {
        setSession(data)
        if (data.current_question) {
          loadCurrentQuestion(data.current_question)
        }
        loadLeaderboard()
      }
    } catch (err) {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentQuestion = async (questionId) => {
    try {
      const { data, error } = await QuizService.getQuizWithQuestions(session.quiz_id)
      if (error) {
        setError('Failed to load question')
      } else {
        const question = data.questions.find(q => q.id === questionId)
        if (question) {
          setCurrentQuestion(question)
          setTimeLeft(question.time_limit || 30)
        }
      }
    } catch (err) {
      setError('Failed to load question')
    }
  }

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await SessionService.getLeaderboard(sessionData.session.id)
      if (!error) {
        setLeaderboard(data || [])
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err)
    }
  }

  const subscribeToUpdates = () => {
    // Subscribe to session updates
    SessionService.subscribeToSession(sessionData.session.id, (payload) => {
      if (payload.new.current_question) {
        loadCurrentQuestion(payload.new.current_question)
      }
    })

    // Subscribe to responses for leaderboard updates
    SessionService.subscribeToResponses(sessionData.session.id, () => {
      loadLeaderboard()
    })
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    try {
      const isCorrect = selectedAnswer.is_correct
      await SessionService.submitAnswer(
        sessionData.session.id,
        sessionData.participant.id,
        currentQuestion.id,
        selectedAnswer.id,
        isCorrect
      )
      
      setSelectedAnswer(null)
    } catch (err) {
      setError('Failed to submit answer')
    }
  }

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {session?.quizzes?.title || 'Quiz Session'}
            </h1>
            <p className="text-purple-200">Session Code: {sessionData.session.code}</p>
          </div>
          <div className="text-right">
            <div className="text-white text-sm">Participants: {participants.length}</div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('dashboard')}
              className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
            >
              Leave Session
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
              {currentQuestion ? (
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
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
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
                          className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                            selectedAnswer?.id === answer.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
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
                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Type your answer here..."
                        rows={4}
                      />
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={submitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full mt-6 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </motion.button>
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
                  {leaderboard.map((participant, index) => (
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
                          {participant.nickname}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {participant.score}
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
