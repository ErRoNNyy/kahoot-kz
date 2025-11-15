import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'

export default function GuestWelcomePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const [sessionCode, setSessionCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleContinue = async () => {
    const trimmedCode = sessionCode.trim().toUpperCase()

    if (!trimmedCode) {
      setError('Please enter a session code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error: sessionError } = await SessionService.validateSessionCode(trimmedCode)

      if (sessionError || !data) {
        console.error('Failed to validate session code:', sessionError)
        setError(sessionError?.message || 'Session not found or not active')
        return
      }

      onNavigate('guest-join', { sessionCode: trimmedCode })
    } catch (err) {
      console.error('Unexpected error validating session code:', err)
      setError(err.message || 'Unable to validate session code right now')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    console.log('Guest signing out...')
    await signOut()
    console.log('Guest sign out completed, navigating to login')
    window.location.href = '/'
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1FB6C4] text-white">
      <div className="flex justify-end p-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSignOut}
          className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Sign out
        </motion.button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <h1 className="text-4xl font-black tracking-[0.2em] uppercase">Aqyldy Quiz!</h1>
          
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-sm space-y-4 text-center"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-red-500/85 px-4 py-3 text-sm font-medium text-white"
            >
              {error}
            </motion.div>
          )}

          <input
            type="text"
            value={sessionCode}
            onChange={(e) => {
              setSessionCode(e.target.value.toUpperCase())
              if (error) setError('')
            }}
            className="w-full rounded-md border border-white/20 bg-white px-4 py-3 text-center text-lg font-semibold text-[#1FB6C4] outline-none transition focus:border-white focus:ring-4 focus:ring-white/40"
            placeholder="Game code"
            maxLength="6"
          />

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleContinue}
            disabled={loading}
            className="w-full rounded-md bg-[#FF8A24] py-3 text-lg font-semibold text-white transition hover:bg-[#ff9e4b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Checking...' : 'Enter'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
