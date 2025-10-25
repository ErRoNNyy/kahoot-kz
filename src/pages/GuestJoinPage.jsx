import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'

export default function GuestJoinPage({ onNavigate, onSessionJoined }) {
  const { user } = useAuth()
  const [sessionCode, setSessionCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      setError('Please enter a session code')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Guest joining session with:', { sessionCode: sessionCode.toUpperCase(), participantId: user.id, nickname: user.nickname })
      
      const { data, error } = await SessionService.joinSession(
        sessionCode.toUpperCase(),
        user.id,
        user.nickname
      )

      console.log('Guest join session result:', { data, error })

      if (error) {
        console.error('Guest join session error:', error)
        setError(`Failed to join session: ${error.message}`)
      } else {
        console.log('Guest successfully joined session:', data)
        onSessionJoined(data)
        onNavigate('guest-waiting')
      }
    } catch (err) {
      console.error('Guest join session failed:', err)
      setError(`Failed to join session: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Join Quiz Room</h1>
          <p className="text-purple-200">Enter the room code to join the quiz session</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-8 shadow-xl"
        >
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Play?</h2>
            <p className="text-gray-600">Enter the room code provided by the host</p>
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Nickname *
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-4 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter room code"
                maxLength="6"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                  👤
                </div>
                <div>
                  <p className="text-sm text-gray-600">Joining as:</p>
                  <p className="font-semibold text-gray-800">{user?.nickname || 'Guest'}</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinSession}
              disabled={loading}
              className="w-full bg-purple-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </motion.button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('guest-welcome')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Welcome
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
