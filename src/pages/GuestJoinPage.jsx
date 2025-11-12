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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

      <div className="relative mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 text-4xl font-bold text-white">Join Quiz Room</h1>
          <p className="text-emerald-100">Enter the room code to join the quiz session</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
        >
          <div className="mb-8 text-center">
            <div className="mb-4 text-6xl">🎮</div>
            <h2 className="mb-2 text-2xl font-bold text-emerald-900">Ready to Play?</h2>
            <p className="text-emerald-600">Enter the room code provided by the host</p>
          </div>

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
                Your Nickname *
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-4 text-center text-2xl font-mono text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                placeholder="Enter room code"
                maxLength="6"
              />
            </div>

            <div className="rounded-2xl border border-emerald-100/80 bg-white/80 p-4 shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                  👤
                </div>
                <div>
                  <p className="text-sm text-emerald-600">Joining as:</p>
                  <p className="font-semibold text-emerald-900">{user?.nickname || 'Guest'}</p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinSession}
              disabled={loading}
              className="w-full rounded-full bg-emerald-500 py-4 px-6 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </motion.button>
          </div>

          <div className="mt-8 border-t border-emerald-100/80 pt-6">
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('guest-welcome')}
                className="text-emerald-600 transition-colors hover:text-emerald-800"
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
