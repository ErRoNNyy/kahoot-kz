import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'

export default function QuizCreationPage({ onNavigate, editQuizData }) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [quizData, setQuizData] = useState({
    title: '',
    description: ''
  })
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    image: null,
    imageUrl: null,
    timeLimit: 30,
    questionType: 'MCQ',
    answers: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false }
    ]
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [editQuizId, setEditQuizId] = useState(null)

  // Load quiz data for editing
  useEffect(() => {
    if (editQuizData?.quizId) {
      setIsEditMode(true)
      setEditQuizId(editQuizData.quizId)
      loadQuizForEdit(editQuizData.quizId)
    }
  }, [editQuizData])

  const loadQuizForEdit = async (quizId) => {
    setLoading(true)
    try {
      const { data, error } = await QuizService.getQuizWithQuestions(quizId)
      if (error) {
        setError(`Failed to load quiz: ${error.message}`)
        return
      }

      if (data) {
        // Set quiz data
        setQuizData({
          title: data.title,
          description: data.description
        })

        // Set questions data
        const formattedQuestions = data.questions.map(q => ({
          id: q.id,
          text: q.text,
          imageUrl: q.image_url,
          timeLimit: q.time_limit,
          questionType: q.question_type,
          answers: q.answers.map(a => ({
            id: a.id,
            text: a.text,
            is_correct: a.is_correct
          }))
        }))

        setQuestions(formattedQuestions)
        setCurrentStep(2) // Go to questions step
      }
    } catch (err) {
      setError('Failed to load quiz for editing')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCurrentQuestion(prev => ({ ...prev, image: file }))
    }
  }

  const validateCurrentQuestion = () => {
    const errors = {}
    
    // Validate question text
    if (!currentQuestion.text.trim()) {
      errors.questionText = 'Question text is required'
    } else if (currentQuestion.text.trim().length < 10) {
      errors.questionText = 'Question text must be at least 10 characters'
    }

    // Validate answers based on type
    if (currentQuestion.questionType === 'MCQ') {
      const validAnswers = currentQuestion.answers.filter(answer => answer.text.trim())
      if (validAnswers.length < 2) {
        errors.answers = 'At least 2 answer options required'
      }
      
      const hasCorrectAnswer = validAnswers.some(answer => answer.is_correct)
      if (!hasCorrectAnswer) {
        errors.correctAnswer = 'Please mark one answer as correct'
      }
    } else if (currentQuestion.questionType === 'Short Answer') {
      const validAnswers = currentQuestion.answers.filter(answer => answer.text.trim())
      if (validAnswers.length === 0) {
        errors.answers = 'At least one acceptable answer required'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (currentStep === 1) {
      if (!quizData.title.trim()) {
        setError('Please enter a quiz title')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      setCurrentStep(3)
    }
    setError('')
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
    setError('')
  }

  const addQuestion = () => {
    // Use validation helper
    if (!validateCurrentQuestion()) {
      setError('Please fix the validation errors before adding the question')
      return
    }

    // Additional validations
    if (currentQuestion.questionType === 'MCQ') {
      // Check for duplicate answers
      const validAnswers = currentQuestion.answers.filter(answer => answer.text.trim())
      const answerTexts = validAnswers.map(answer => answer.text.trim().toLowerCase())
      const uniqueAnswers = new Set(answerTexts)
      if (answerTexts.length !== uniqueAnswers.size) {
        setError('Please remove duplicate answer options')
        return
      }
    } else if (currentQuestion.questionType === 'Short Answer') {
      // Check for duplicate answers
      const validAnswers = currentQuestion.answers.filter(answer => answer.text.trim())
      const answerTexts = validAnswers.map(answer => answer.text.trim().toLowerCase())
      const uniqueAnswers = new Set(answerTexts)
      if (answerTexts.length !== uniqueAnswers.size) {
        setError('Please remove duplicate acceptable answers')
        return
      }
    }

    // Automatically assign order index based on current questions count
    const questionWithOrder = {
      ...currentQuestion,
      orderIndex: questions.length
    }

    setQuestions(prev => [...prev, questionWithOrder])
    setCurrentQuestion({
      text: '',
      image: null,
      imageUrl: null,
      timeLimit: 30,
      questionType: 'MCQ',
      answers: [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ]
    })
    setError('')
    setValidationErrors({})
  }

  const selectQuestionType = (type) => {
    setCurrentQuestion(prev => ({
      ...prev,
      questionType: type,
      answers: type === 'MCQ' ? [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false }
      ] : type === 'True/False' ? [
        { text: 'True', is_correct: false },
        { text: 'False', is_correct: false }
      ] : [
        { text: '', is_correct: true }
      ]
    }))
  }

  const saveQuiz = async () => {
    
    if (!quizData.title.trim()) {
      console.log('Validation failed: No quiz title')
      setError('Please enter a quiz title')
      alert('❌ Quiz title is required!\n\nPlease enter a title for your quiz.')
      return
    }

    if (quizData.title.trim().length < 3) {
      console.log('Validation failed: Quiz title too short')
      setError('Quiz title must be at least 3 characters long')
      alert('❌ Quiz title must be at least 3 characters long!\n\nPlease enter a longer title for your quiz.')
      return
    }

    if (questions.length === 0) {
      console.log('Validation failed: No questions')
      setError('Please add at least one question')
      return
    }

    if (questions.length < 2) {
      console.log('Validation failed: Not enough questions')
      setError('Please add at least 2 questions to create a meaningful quiz')
      alert('❌ Not enough questions!\n\nPlease add at least 2 questions to create a meaningful quiz.')
      return
    }

    if (questions.length > 50) {
      console.log('Validation failed: Too many questions')
      setError('Quiz cannot have more than 50 questions')
      return
    }

    // Validate all questions have proper answers
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      const validAnswers = question.answers.filter(answer => answer.text.trim())
      
      if (question.questionType === 'MCQ' && validAnswers.length < 2) {
        console.log(`Validation failed: Question ${i + 1} has less than 2 answers`)
        setError(`Question ${i + 1}: Please provide at least 2 answer options`)
        alert(`❌ Question ${i + 1} needs more answers!\n\nMultiple choice questions need at least 2 answer options.`)
        return
      }
      
      if (question.questionType === 'Short Answer' && validAnswers.length === 0) {
        console.log(`Validation failed: Question ${i + 1} has no acceptable answers`)
        setError(`Question ${i + 1}: Please provide at least one acceptable answer`)
        alert(`❌ Question ${i + 1} needs acceptable answers!\n\nShort answer questions need at least one acceptable answer.`)
        return
      }
      
      const hasCorrectAnswer = validAnswers.some(answer => answer.is_correct)
      if (!hasCorrectAnswer) {
        console.log(`Validation failed: Question ${i + 1} has no correct answer`)
        setError(`Question ${i + 1}: Please mark at least one answer as correct`)
        alert(`❌ Question ${i + 1} needs a correct answer!\n\nPlease mark at least one answer as correct.`)
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      if (isEditMode) {
        console.log('Starting quiz update...', { quizData, questionsCount: questions.length, quizId: editQuizId })
        
        // Update quiz
        const { data: updatedQuiz, error: quizError } = await QuizService.updateQuiz(editQuizId, {
          title: quizData.title,
          description: quizData.description
        })

        if (quizError) {
          console.error('Quiz update error:', quizError)
          throw new Error(`Failed to update quiz: ${quizError.message}`)
        }

        console.log('Quiz updated successfully:', updatedQuiz.id)
        
        // For now, we'll just update the quiz metadata
        // In a full implementation, you'd also update questions and answers
        console.log('Quiz update completed!')
        alert('✅ Quiz updated successfully!\n\nYour quiz changes have been saved.')
        onNavigate('dashboard')
      } else {
        // Check if user exists
        if (!user) {
          console.log('Validation failed: No user found')
          setError('User not found. Please sign in again.')
          setLoading(false)
          return
        }

        console.log('Starting quiz creation...', { quizData, questionsCount: questions.length, userId: user.id })
        
        // Create quiz
        const { data: quiz, error: quizError } = await QuizService.createQuiz(
          quizData.title,
          quizData.description,
          user.id
        )

        console.log('Quiz creation result:', { quiz, quizError })

        if (quizError) {
          console.error('Quiz creation error:', quizError)
          throw new Error(`Failed to create quiz: ${quizError.message}`)
        }

        if (!quiz) {
          throw new Error('Quiz was not created successfully')
        }

        console.log('Quiz created successfully:', quiz.id)

        // Create questions and answers
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i]
          console.log(`Creating question ${i + 1}/${questions.length}:`, question.text)
          
          let imageUrl = null
          
          // Upload image if present
          if (question.image) {
            console.log('Uploading image for question:', i + 1)
            const { data: uploadedUrl, error: uploadError } = await QuizService.uploadImage(
              question.image,
              quiz.id,
              Date.now() // Simple ID for now
            )
            if (uploadError) {
              console.error('Image upload error:', uploadError)
              throw new Error(`Failed to upload image: ${uploadError.message}`)
            }
            imageUrl = uploadedUrl
            console.log('Image uploaded successfully:', imageUrl)
          }

          // Create question
          const { data: createdQuestion, error: questionError } = await QuizService.createQuestion(
            quiz.id,
            question.text,
            imageUrl,
            question.timeLimit,
            question.questionType,
            question.orderIndex
          )

          console.log('Question creation result:', { createdQuestion, questionError })

          if (questionError) {
            console.error('Question creation error:', questionError)
            throw new Error(`Failed to create question: ${questionError.message}`)
          }

          if (!createdQuestion) {
            throw new Error('Question was not created successfully')
          }

          // Create answers
          const answersToCreate = question.answers.filter(answer => answer.text.trim())
          console.log('Creating answers for question:', answersToCreate)
          
          const { data: createdAnswers, error: answersError } = await QuizService.createAnswers(
            createdQuestion.id,
            answersToCreate
          )

          console.log('Answers creation result:', { createdAnswers, answersError })

          if (answersError) {
            console.error('Answers creation error:', answersError)
            throw new Error(`Failed to create answers: ${answersError.message}`)
          }

          console.log(`Question ${i + 1} created successfully`)
        }

        console.log('All questions created successfully!')
        alert('✅ Quiz saved successfully!\n\nYour quiz has been created and saved.')
        onNavigate('dashboard')
      }
    } catch (err) {
      console.error('Quiz save failed:', err)
      console.error('Error details:', err)
      setError(err.message || 'Failed to save quiz')
    } finally {
      console.log('Setting loading to false...')
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-8 shadow-xl max-w-2xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Quiz Details</h2>
            <p className="text-gray-600 mb-8">Let's start by creating your quiz title and description.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter quiz title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter quiz description"
                  rows={4}
                />
              </div>
            </div>
          </motion.div>
        )

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-8 shadow-xl max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Add Questions</h2>
            <p className="text-gray-600 mb-8">Create questions for your quiz. You can add multiple questions.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Question Editor */}
              <div className="lg:col-span-2">
                <div className="space-y-6">
                  {/* Question Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Question Type *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('MCQ')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          currentQuestion.questionType === 'MCQ'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">📝</div>
                        <div className="font-medium">Multiple Choice</div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('True/False')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          currentQuestion.questionType === 'True/False'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">✅</div>
                        <div className="font-medium">True/False</div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('Short Answer')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          currentQuestion.questionType === 'Short Answer'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-2">✍️</div>
                        <div className="font-medium">Short Answer</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Text *
                    </label>
                    <textarea
                      value={currentQuestion.text}
                      onChange={(e) => {
                        setCurrentQuestion({ ...currentQuestion, text: e.target.value })
                        // Clear validation error when user starts typing
                        if (validationErrors.questionText) {
                          setValidationErrors({ ...validationErrors, questionText: null })
                        }
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        validationErrors.questionText ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter your question"
                      rows={3}
                    />
                    {validationErrors.questionText && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.questionText}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {currentQuestion.text.length}/10 characters minimum
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Image (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        {currentQuestion.image ? (
                          <div>
                            <img
                              src={URL.createObjectURL(currentQuestion.image)}
                              alt="Preview"
                              className="max-h-32 mx-auto rounded-lg"
                            />
                            <p className="text-sm text-gray-600 mt-2">Click to change image</p>
                          </div>
                        ) : (
                          <div>
                            <div className="text-4xl mb-2">📷</div>
                            <p className="text-gray-600">Click to upload an image</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Time Limit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.timeLimit}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      min="5"
                      max="300"
                    />
                  </div>

                  {/* Answers based on question type */}
                  {currentQuestion.questionType === 'MCQ' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Multiple Choice Answers *
                      </label>
                      <div className="space-y-3">
                        {currentQuestion.answers.map((answer, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <input
                              type="radio"
                              name="correct-answer"
                              checked={answer.is_correct}
                              onChange={() => {
                                const newAnswers = currentQuestion.answers.map((a, i) => ({
                                  ...a,
                                  is_correct: i === index
                                }))
                                setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
                                // Clear validation error when user selects correct answer
                                if (validationErrors.correctAnswer) {
                                  setValidationErrors({ ...validationErrors, correctAnswer: null })
                                }
                              }}
                              className="w-4 h-4 text-purple-600"
                            />
                            <input
                              type="text"
                              value={answer.text}
                              onChange={(e) => {
                                const newAnswers = [...currentQuestion.answers]
                                newAnswers[index] = { ...answer, text: e.target.value }
                                setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
                                // Clear validation error when user starts typing
                                if (validationErrors.answers) {
                                  setValidationErrors({ ...validationErrors, answers: null })
                                }
                              }}
                              className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                                !answer.text.trim() && validationErrors.answers ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder={`Answer ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      {validationErrors.answers && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.answers}</p>
                      )}
                      {validationErrors.correctAnswer && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.correctAnswer}</p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        At least 2 answers required, mark one as correct
                      </p>
                    </div>
                  )}

                  {currentQuestion.questionType === 'True/False' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correct Answer *
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="correct-answer"
                            checked={currentQuestion.answers[0]?.is_correct}
                            onChange={() => {
                              const newAnswers = [
                                { text: 'True', is_correct: true },
                                { text: 'False', is_correct: false }
                              ]
                              setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
                            }}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-gray-800">True</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            name="correct-answer"
                            checked={currentQuestion.answers[1]?.is_correct}
                            onChange={() => {
                              const newAnswers = [
                                { text: 'True', is_correct: false },
                                { text: 'False', is_correct: true }
                              ]
                              setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
                            }}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-gray-800">False</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentQuestion.questionType === 'Short Answer' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Acceptable Answers (one per line) *
                      </label>
                      <textarea
                        value={currentQuestion.answers.map(a => a.text).join('\n')}
                        onChange={(e) => {
                          const answers = e.target.value.split('\n').filter(text => text.trim()).map(text => ({
                            text: text.trim(),
                            is_correct: true
                          }))
                          setCurrentQuestion({ ...currentQuestion, answers })
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter acceptable answers, one per line"
                        rows={4}
                      />
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addQuestion}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    Add Question
                  </motion.button>
                </div>
              </div>

              {/* Questions List */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Questions ({questions.length})</h3>
                  {questions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No questions added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((question, index) => (
                        <div key={index} className="bg-white rounded-lg p-3 border">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-700 truncate">{question.text}</p>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {question.questionType} • {question.timeLimit}s
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl p-8 shadow-xl max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Review & Finish</h2>
            <p className="text-gray-600 mb-8">Review your quiz before saving it.</p>

            <div className="space-y-6">
              {/* Quiz Info */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Quiz Information</h3>
                <div>
                  <h4 className="font-medium text-gray-700">Title:</h4>
                  <p className="text-gray-600">{quizData.title}</p>
                </div>
                {quizData.description && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-700">Description:</h4>
                    <p className="text-gray-600">{quizData.description}</p>
                  </div>
                )}
              </div>

              {/* Questions Review */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Questions ({questions.length})</h3>
                {questions.map((question, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 mb-4 border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800">Question {index + 1}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {question.questionType}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {question.timeLimit}s
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{question.text}</p>
                    {question.questionType === 'MCQ' && (
                      <div className="space-y-1">
                        {question.answers.map((answer, answerIndex) => (
                          <div key={answerIndex} className={`text-sm p-2 rounded ${
                            answer.is_correct ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {String.fromCharCode(65 + answerIndex)}. {answer.text}
                            {answer.is_correct && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                    {question.questionType === 'True/False' && (
                      <div className="text-sm">
                        <div className={`p-2 rounded ${
                          question.answers[0]?.is_correct ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          True {question.answers[0]?.is_correct && '✓'}
                        </div>
                        <div className={`p-2 rounded ${
                          question.answers[1]?.is_correct ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          False {question.answers[1]?.is_correct && '✓'}
                        </div>
                      </div>
                    )}
                    {question.questionType === 'Short Answer' && (
                      <div className="text-sm">
                        <p className="text-gray-600">Acceptable answers:</p>
                        {question.answers.map((answer, answerIndex) => (
                          <div key={answerIndex} className="bg-gray-100 text-gray-600 p-2 rounded mt-1">
                            {answer.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
            </h1>
            <p className="text-purple-200">
              {isEditMode ? 'Update your quiz step by step' : 'Build your interactive quiz step by step'}
            </p>
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

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  currentStep >= step ? 'bg-purple-600' : 'bg-gray-300'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={prevStep}
            disabled={currentStep === 1}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </motion.button>

          <div className="flex space-x-4">
            {currentStep < 3 ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextStep}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Next
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={saveQuiz}
                disabled={loading || questions.length === 0}
                title={`Button state: loading=${loading}, questions=${questions.length}, disabled=${loading || questions.length === 0}`}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Quiz' : 'Finish & Save Quiz')}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
