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
            className="mx-auto max-w-2xl rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <h2 className="mb-6 text-3xl font-bold text-emerald-900">Quiz Details</h2>
            <p className="mb-8 text-emerald-600">Let's start by creating your quiz title and description.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-emerald-800">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  placeholder="Enter quiz title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-emerald-800">
                  Description
                </label>
                <textarea
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
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
            className="mx-auto max-w-4xl rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <h2 className="mb-6 text-3xl font-bold text-emerald-900">Add Questions</h2>
            <p className="mb-8 text-emerald-600">Create questions for your quiz. You can add multiple questions.</p>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100"
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
                    <label className="mb-3 block text-sm font-medium text-emerald-800">
                      Question Type *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('MCQ')}
                        className={`rounded-2xl border-2 p-4 transition-all ${
                          currentQuestion.questionType === 'MCQ'
                            ? 'border-emerald-400 bg-emerald-100/60 text-emerald-700 shadow-[0_10px_25px_-20px_rgba(16,185,129,0.8)]'
                            : 'border-emerald-100/60 bg-white/80 hover:border-emerald-200'
                        }`}
                      >
                        <div className="text-2xl mb-2">📝</div>
                        <div className="font-medium">Multiple Choice</div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('True/False')}
                        className={`rounded-2xl border-2 p-4 transition-all ${
                          currentQuestion.questionType === 'True/False'
                            ? 'border-emerald-400 bg-emerald-100/60 text-emerald-700 shadow-[0_10px_25px_-20px_rgba(16,185,129,0.8)]'
                            : 'border-emerald-100/60 bg-white/80 hover:border-emerald-200'
                        }`}
                      >
                        <div className="text-2xl mb-2">✅</div>
                        <div className="font-medium">True/False</div>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectQuestionType('Short Answer')}
                        className={`rounded-2xl border-2 p-4 transition-all ${
                          currentQuestion.questionType === 'Short Answer'
                            ? 'border-emerald-400 bg-emerald-100/60 text-emerald-700 shadow-[0_10px_25px_-20px_rgba(16,185,129,0.8)]'
                            : 'border-emerald-100/60 bg-white/80 hover:border-emerald-200'
                        }`}
                      >
                        <div className="text-2xl mb-2">✍️</div>
                        <div className="font-medium">Short Answer</div>
                      </motion.button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-emerald-800">
                      Question Text *
                    </label>
                    <textarea
                      value={currentQuestion.text}
                      onChange={(e) => {
                        setCurrentQuestion({ ...currentQuestion, text: e.target.value })
                        if (validationErrors.questionText) {
                          setValidationErrors({ ...validationErrors, questionText: null })
                        }
                      }}
                      className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                        validationErrors.questionText ? 'border-red-300 bg-red-50' : 'border-emerald-200/60 bg-white/85 shadow-inner'
                      }`}
                      placeholder="Enter your question"
                      rows={3}
                    />
                    {validationErrors.questionText && (
                      <p className="mt-1 text-sm text-red-500">{validationErrors.questionText}</p>
                    )}
                    <p className="mt-1 text-xs text-emerald-600">
                      {currentQuestion.text.length}/10 characters minimum
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-emerald-800">
                      Question Image (Optional)
                    </label>
                    <div className="rounded-2xl border-2 border-dashed border-emerald-200/60 bg-white/70 p-6 text-center shadow-inner">
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
                              className="mx-auto max-h-32 rounded-lg shadow"
                            />
                            <p className="mt-2 text-sm text-emerald-600">Click to change image</p>
                          </div>
                        ) : (
                          <div>
                            <div className="mb-2 text-4xl">📷</div>
                            <p className="text-emerald-600">Click to upload an image</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Time Limit */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-emerald-800">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={currentQuestion.timeLimit}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, timeLimit: parseInt(e.target.value) || 30 })}
                      className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                      min="5"
                      max="300"
                    />
                  </div>

                  {/* Answers based on question type */}
                  {currentQuestion.questionType === 'MCQ' && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-emerald-800">
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
                                if (validationErrors.correctAnswer) {
                                  setValidationErrors({ ...validationErrors, correctAnswer: null })
                                }
                              }}
                              className="h-4 w-4 text-emerald-500"
                            />
                            <input
                              type="text"
                              value={answer.text}
                              onChange={(e) => {
                                const newAnswers = [...currentQuestion.answers]
                                newAnswers[index] = { ...answer, text: e.target.value }
                                setCurrentQuestion({ ...currentQuestion, answers: newAnswers })
                                if (validationErrors.answers) {
                                  setValidationErrors({ ...validationErrors, answers: null })
                                }
                              }}
                              className={`flex-1 rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                                !answer.text.trim() && validationErrors.answers ? 'border-red-300 bg-red-50' : 'border-emerald-200/60 bg-white/85 shadow-inner'
                              }`}
                              placeholder={`Answer ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                      {validationErrors.answers && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.answers}</p>
                      )}
                      {validationErrors.correctAnswer && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.correctAnswer}</p>
                      )}
                      <p className="mt-1 text-xs text-emerald-600">
                        At least 2 answers required, mark one as correct
                      </p>
                    </div>
                  )}

                  {currentQuestion.questionType === 'True/False' && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-emerald-800">
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
                            className="h-4 w-4 text-emerald-500"
                          />
                          <span className="text-emerald-900">True</span>
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
                            className="h-4 w-4 text-emerald-500"
                          />
                          <span className="text-emerald-900">False</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentQuestion.questionType === 'Short Answer' && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-emerald-800">
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
                        className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                        placeholder="Enter acceptable answers, one per line"
                        rows={4}
                      />
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={addQuestion}
                    className="w-full rounded-full bg-emerald-500 py-3 px-4 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                  >
                    Add Question
                  </motion.button>
                </div>
              </div>

              {/* Questions List */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-emerald-900">Questions ({questions.length})</h3>
                  {questions.length === 0 ? (
                    <p className="text-sm text-emerald-600">No questions added yet</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((question, index) => (
                        <div key={index} className="rounded-lg border border-emerald-100/60 bg-white/85 p-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm text-emerald-900">{question.text}</p>
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-600">
                              #{index + 1}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-emerald-500">
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
            className="mx-auto max-w-4xl rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <h2 className="mb-6 text-3xl font-bold text-emerald-900">Review & Finish</h2>
            <p className="mb-8 text-emerald-600">Review your quiz before saving it.</p>

            <div className="space-y-6">
              {/* Quiz Info */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
                <h3 className="mb-4 text-xl font-semibold text-emerald-900">Quiz Information</h3>
                <div>
                  <h4 className="font-medium text-emerald-800">Title:</h4>
                  <p className="text-emerald-600">{quizData.title}</p>
                </div>
                {quizData.description && (
                  <div className="mt-3">
                    <h4 className="font-medium text-emerald-800">Description:</h4>
                    <p className="text-emerald-600">{quizData.description}</p>
                  </div>
                )}
              </div>

              {/* Questions Review */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-100/60 p-6">
                <h3 className="mb-4 text-xl font-semibold text-emerald-900">Questions ({questions.length})</h3>
                {questions.map((question, index) => (
                  <div key={index} className="mb-4 rounded-lg border border-emerald-100/60 bg-white/85 p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-medium text-emerald-900">Question {index + 1}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                          {question.questionType}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-600">
                          {question.timeLimit}s
                        </span>
                      </div>
                    </div>
                    <p className="mb-3 text-emerald-600">{question.text}</p>
                    {question.questionType === 'MCQ' && (
                      <div className="space-y-1">
                        {question.answers.map((answer, answerIndex) => (
                          <div
                            key={answerIndex}
                            className={`rounded p-2 text-sm ${
                              answer.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 text-emerald-600'
                            }`}
                          >
                            {String.fromCharCode(65 + answerIndex)}. {answer.text}
                            {answer.is_correct && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                    {question.questionType === 'True/False' && (
                      <div className="text-sm">
                        <div className={`rounded p-2 ${
                          question.answers[0]?.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 text-emerald-600'
                        }`}>
                          True {question.answers[0]?.is_correct && '✓'}
                        </div>
                        <div className={`mt-2 rounded p-2 ${
                          question.answers[1]?.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-white/70 text-emerald-600'
                        }`}>
                          False {question.answers[1]?.is_correct && '✓'}
                        </div>
                      </div>
                    )}
                    {question.questionType === 'Short Answer' && (
                      <div className="text-sm">
                        <p className="text-emerald-600">Acceptable answers:</p>
                        {question.answers.map((answer, answerIndex) => (
                          <div key={answerIndex} className="mt-1 rounded bg-white/70 p-2 text-emerald-600">
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>
      <div className="relative mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">
              {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
            </h1>
            <p className="text-emerald-100">
              {isEditMode ? 'Update your quiz step by step' : 'Build your interactive quiz step by step'}
            </p>
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

        {/* Progress Steps */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-emerald-950 ${
                  currentStep >= step ? 'bg-emerald-400' : 'bg-emerald-200/70'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`mx-2 h-1 w-16 ${
                    currentStep > step ? 'bg-emerald-400' : 'bg-emerald-200/60'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={prevStep}
            disabled={currentStep === 1}
            className="rounded-full bg-emerald-200 px-6 py-3 font-semibold text-emerald-800 transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </motion.button>

          <div className="flex space-x-4">
            {currentStep < 3 ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextStep}
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
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
                className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
