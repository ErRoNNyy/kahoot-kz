import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'

export default function GuestWelcomePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    // Update guest user with nickname if needed
    if (user?.nickname !== nickname) {
      const updatedUser = { ...user, nickname }
      localStorage.setItem('guest_user', JSON.stringify(updatedUser))
    }

    onNavigate('guest-join')
  }

  const handleSignOut = async () => {
    console.log('Guest signing out...')
    await signOut()
    console.log('Guest sign out completed, navigating to login')
    // Force a page reload to clear any cached state
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome, {user?.nickname || 'Guest'}!
            </h1>
            <p className="text-purple-200">Join a quiz session as a guest</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
          >
            Sign Out
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎮</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Join Quiz Room</h2>
              <p className="text-gray-600">Enter a room code to join a quiz session</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your nickname"
                  defaultValue={user?.nickname || ''}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? 'Loading...' : 'Join Room'}
              </motion.button>
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-xl"
          >
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">How It Works</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Get Room Code</h3>
                  <p className="text-gray-600 text-sm">Ask the host for the 6-character room code</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Enter Code</h3>
                  <p className="text-gray-600 text-sm">Type the room code to join the session</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Wait for Start</h3>
                  <p className="text-gray-600 text-sm">See other participants and wait for host to begin</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Play Quiz</h3>
                  <p className="text-gray-600 text-sm">Answer questions and compete with others!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
