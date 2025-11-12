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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-6 py-8">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

      <div className="relative mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">
              Welcome, {user?.nickname || 'Guest'}!
            </h1>
            <p className="text-emerald-100">Join a quiz session as a guest</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-6 py-3 text-emerald-50 transition-colors hover:bg-emerald-500/30"
          >
            Sign Out
          </motion.button>
        </motion.div>

        {/* Main Content */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Join Room Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">🎮</div>
              <h2 className="mb-2 text-2xl font-bold text-emerald-900">Join Quiz Room</h2>
              <p className="text-emerald-600">Enter a room code to join a quiz session</p>
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

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-emerald-800">
                  Your nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  placeholder="Enter your nickname"
                  defaultValue={user?.nickname || ''}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRoom}
                disabled={loading}
                className="w-full rounded-full bg-emerald-500 py-4 px-6 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
          >
            <div className="mb-6 text-center">
              <div className="mb-4 text-6xl">👥</div>
              <h2 className="mb-2 text-2xl font-bold text-emerald-900">How It Works</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Get Room Code</h3>
                  <p className="text-sm text-emerald-600">Ask the host for the 6-character room code</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Enter Code</h3>
                  <p className="text-sm text-emerald-600">Type the room code to join the session</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Wait for Start</h3>
                  <p className="text-sm text-emerald-600">See other participants and wait for host to begin</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Play Quiz</h3>
                  <p className="text-sm text-emerald-600">Answer questions and compete with others!</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
