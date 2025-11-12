import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'

export default function SessionJoinPage({ onNavigate, onSessionJoined }) {
  const { user } = useAuth()
  const [sessionCode, setSessionCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const joinSession = async () => {
    if (!sessionCode.trim()) {
      setError('Please enter a session code')
      return
    }

    if (!nickname.trim()) {
      setError('Please enter a nickname')
      return
    }

    setLoading(true)
    setError('')

    try {
      const participantId = user?.id || `guest_${Date.now()}`
      console.log('Joining session with:', { sessionCode: sessionCode.toUpperCase(), participantId, nickname })
      
      const { data, error } = await SessionService.joinSession(
        sessionCode.toUpperCase(),
        participantId,
        nickname
      )

      console.log('Join session result:', { data, error })

      if (error) {
        console.error('Join session error:', error)
        setError(`Failed to join session: ${error.message}`)
      } else {
        console.log('Successfully joined session:', data)
        onSessionJoined(data)
        onNavigate('play-quiz')
      }
    } catch (err) {
      console.error('Join session failed:', err)
      setError(`Failed to join session: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="mb-2 text-4xl font-bold text-white">Join Quiz Session</h1>
          <p className="text-emerald-100">Enter the session code to participate</p>
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
            <p className="text-emerald-600">Enter the session code provided by the host</p>
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
                Session Code *
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-emerald-200/60 bg-white/80 px-4 py-4 text-center text-2xl font-mono text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                placeholder="Enter session code"
                maxLength="6"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-800">
                Your Nickname *
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-xl border border-emerald-200/60 bg-white/80 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                placeholder="Enter your nickname"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={joinSession}
              disabled={loading}
              className="w-full rounded-full bg-emerald-500 py-4 px-6 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </motion.button>
          </div>

          <div className="mt-8 border-t border-emerald-100/80 pt-6">
            <div className="flex justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate('dashboard')}
                className="text-emerald-600 transition-colors hover:text-emerald-800"
              >
                Back to Dashboard
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
