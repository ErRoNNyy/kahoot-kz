import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { QuizService } from '../services/quiz.js'
import { testDatabaseConnection, testQuizCreation } from '../utils/testDatabase.js'
import { debugUserQuizzes } from '../utils/debugQuizzes.js'
import { getUserDisplayName, getUserAvatar } from '../utils/userHelpers.js'

export default function DashboardPage({ onNavigate }) {
  const { user, signOut } = useAuth()
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

  const handleSignOut = async () => {
    await signOut()
  }

  const testDatabase = async () => {
    console.log('Testing database connection...')
    const result = await testDatabaseConnection()
    if (result.success) {
      alert('✅ Database connection successful!')
    } else {
      alert(`❌ Database connection failed: ${result.error?.message || 'Unknown error'}`)
    }
  }

  const testQuizCreation = async () => {
    console.log('Testing quiz creation...')
    const result = await testQuizCreation()
    if (result.success) {
      alert('✅ Quiz creation test successful!')
    } else {
      alert(`❌ Quiz creation test failed: ${result.error?.message || 'Unknown error'}`)
    }
  }

  const refreshQuizzes = async () => {
    console.log('Manually refreshing quizzes...')
    setLoading(true)
    await loadQuizzes()
  }

  const debugQuizzes = async () => {
    if (!user?.id) {
      alert('❌ No user ID found!')
      return
    }
    
    console.log('🔍 Starting quiz debug...')
    const result = await debugUserQuizzes(user.id)
    
    if (result.success) {
      const message = `
🔍 Quiz Debug Results:
📊 Total quizzes in DB: ${result.allQuizzes.length}
👤 Your quizzes: ${result.userQuizzes.length}
🆔 All user IDs: ${result.allUserIds.join(', ')}
✅ Your ID found: ${result.userFound ? 'Yes' : 'No'}
      `
      alert(message)
      console.log('Full debug result:', result)
    } else {
      alert(`❌ Debug failed: ${result.error?.message || 'Unknown error'}`)
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
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center text-2xl">
              {getUserAvatar(user)}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {getUserDisplayName(user)}!
              </h1>
              <p className="text-purple-200">Create and host interactive quizzes</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('profile')}
              className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
            >
              👤 Profile
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
              className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
            >
              Sign Out
            </motion.button>
          </div>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('create-quiz')}
            className="bg-white rounded-2xl p-6 shadow-xl cursor-pointer hover:shadow-2xl transition-all"
          >
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Create Quiz</h3>
            <p className="text-gray-600">Build your own interactive quiz with questions and images</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('host-session')}
            className="bg-white rounded-2xl p-6 shadow-xl cursor-pointer hover:shadow-2xl transition-all"
          >
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Host Session</h3>
            <p className="text-gray-600">Start a live quiz session and share the code</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onNavigate('join-session')}
            className="bg-white rounded-2xl p-6 shadow-xl cursor-pointer hover:shadow-2xl transition-all"
          >
            <div className="text-4xl mb-4">🎮</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Join Session</h3>
            <p className="text-gray-600">Enter a session code to participate in a quiz</p>
          </motion.div>
        </div>

        {/* Debug Section */}
        {!user?.isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-yellow-50 rounded-2xl p-6 shadow-xl mb-6"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Debug Tools</h2>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p><strong>User ID:</strong> {user?.id || 'No user ID'}</p>
              <p><strong>Is Guest:</strong> {user?.isGuest ? 'Yes' : 'No'}</p>
              <p><strong>Quizzes Count:</strong> {quizzes.length}</p>
              <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={testDatabase}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Test Database Connection
              </button>
              <button
                onClick={testQuizCreation}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                Test Quiz Creation
              </button>
              <button
                onClick={refreshQuizzes}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
              >
                🔄 Refresh Quizzes
              </button>
              <button
                onClick={debugQuizzes}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                🔍 Debug Quizzes
              </button>
            </div>
          </motion.div>
        )}

        {/* My Quizzes Section */}
        {!user?.isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Quizzes</h2>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-gray-600 mb-4">No quizzes created yet</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onNavigate('create-quiz')}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Your First Quiz
                </motion.button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((quiz, index) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <h3 className="font-bold text-gray-800 mb-2">{quiz.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>Created {new Date(quiz.created_at).toLocaleDateString()}</span>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => onNavigate('create-quiz', { editQuizId: quiz.id })}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          ✏️ Edit
                        </button>
                        <button className="text-purple-600 hover:text-purple-700 font-medium">
                          🎯 Host
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
