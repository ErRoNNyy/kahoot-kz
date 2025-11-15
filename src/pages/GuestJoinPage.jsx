import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'
import bgSession from '../assets/bg_session.png'

export default function GuestJoinPage({ onNavigate, onSessionJoined, sessionCode }) {
  const { user } = useAuth()

  const storedGuest = useMemo(() => {
    try {
      const raw = localStorage.getItem('guest_user')
      return raw ? JSON.parse(raw) : {}
    } catch (err) {
      console.warn('Failed to parse guest_user from localStorage:', err)
      return {}
    }
  }, [])

  const [nickname, setNickname] = useState(() => user?.nickname || storedGuest.nickname || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quizTitle, setQuizTitle] = useState('Quiz Room')
  const [loadingTitle, setLoadingTitle] = useState(false)
  const [titleError, setTitleError] = useState('')

  useEffect(() => {
    if (user?.nickname && !nickname) {
      setNickname(user.nickname)
    }
  }, [user?.nickname, nickname])

  const normalizedSessionCode = useMemo(() => {
    return (sessionCode ? String(sessionCode) : '').trim().toUpperCase()
  }, [sessionCode])

  useEffect(() => {
    if (!normalizedSessionCode) {
      setQuizTitle('Quiz Room')
      return
    }

    let isMounted = true
    setLoadingTitle(true)
    setTitleError('')

    SessionService.validateSessionCode(normalizedSessionCode)
      .then(({ data, error }) => {
        if (!isMounted) return

        if (error) {
          console.error('Failed to validate session code:', error)
          setTitleError('Unable to load quiz details')
          return
        }

        setQuizTitle(data?.quizzes?.title || 'Quiz Room')
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Unexpected error validating session code:', err)
        setTitleError('Unable to load quiz details')
      })
      .finally(() => {
        if (!isMounted) return
        setLoadingTitle(false)
      })

    return () => {
      isMounted = false
    }
  }, [normalizedSessionCode])

  const joinSession = async () => {
    const trimmedNickname = nickname.trim()

    if (!normalizedSessionCode) {
      setError('Session code missing. Please go back and enter it again.')
      return
    }

    if (!trimmedNickname) {
      setError('Please enter your nickname')
      return
    }

    if (!user?.id) {
      setError('Unable to identify guest user. Please restart guest login.')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('Guest joining session with:', {
        sessionCode: normalizedSessionCode,
        participantId: user.id,
        nickname: trimmedNickname
      })

      const { data, error: joinError } = await SessionService.joinSession(
        normalizedSessionCode,
        user.id,
        trimmedNickname
      )

      console.log('Guest join session result:', { data, joinError })

      if (joinError) {
        console.error('Guest join session error:', joinError)
        setError(`Failed to join session: ${joinError.message}`)
        return
      }

      const updatedGuest = {
        ...(storedGuest || {}),
        ...user,
        id: user.id,
        isGuest: true,
        nickname: trimmedNickname
      }

      localStorage.setItem('guest_user', JSON.stringify(updatedGuest))

      console.log('Guest successfully joined session:', data)
      onSessionJoined(data)
      onNavigate('guest-waiting')
    } catch (err) {
      console.error('Guest join session failed:', err)
      setError(`Failed to join session: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0">
        <img
          src={bgSession}
          alt="Quiz background"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <button
          onClick={() => onNavigate('guest-welcome')}
          className="absolute left-6 top-6 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-[#EF7C1D] transition hover:bg-white"
        >
          ← Change Code
        </button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          <h1 className="text-4xl font-black text-white drop-shadow-lg">
            {loadingTitle ? 'Loading quiz…' : quizTitle}
          </h1>
          <p className="mt-2 text-sm font-semibold text-white/85 drop-shadow">
            Session code: {normalizedSessionCode || '— — — — — —'}
          </p>
          {titleError && (
            <p className="mt-2 text-sm text-red-200 drop-shadow">{titleError}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md rounded-xl bg-white/90 px-8 py-8 text-center shadow-[0_25px_45px_-25px_rgba(0,0,0,0.6)] backdrop-blur-md"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-semibold text-white"
            >
              {error}
            </motion.div>
          )}

          <label className="mb-3 block text-sm font-semibold text-[#444]">
            Nickname
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value)
              if (error) setError('')
            }}
            className="mb-5 w-full rounded-md border border-[#f5d2b0] bg-white px-4 py-3 text-lg font-medium text-[#EF7C1D] placeholder:text-[#f0bfa0] outline-none transition focus:border-[#EF7C1D] focus:ring-4 focus:ring-[#ef7c1d33]"
            placeholder="Your nickname"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={joinSession}
            disabled={loading || !normalizedSessionCode}
            className="w-full rounded-md bg-[#FF8A24] py-3 text-lg font-bold text-white transition hover:bg-[#ff9e4b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Joining...' : 'Enter'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  )
}
