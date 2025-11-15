import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'
import bgSession from '../assets/bg_session.png'

export default function GuestWaitingPage({ sessionData, onNavigate }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)

  const sessionId = sessionData?.session?.id
  const participantId = sessionData?.participant?.id

  useEffect(() => {
    if (sessionData) {
      loadSession()
      const cleanup = subscribeToUpdates()
      return () => cleanup?.()
    }
  }, [sessionData])

  const loadSession = async () => {
    if (!sessionId) return

    try {
      const { data, error } = await SessionService.getSession(sessionId)
      if (error) {
        setError('Failed to load session')
      } else {
        setSession(data)
        loadParticipants()
      }
    } catch (err) {
      setError('Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  const loadParticipants = async () => {
    if (!sessionId) return

    try {
      const { data, error } = await SessionService.getLeaderboard(sessionId)
      if (!error) {
        const activeParticipants = (data || []).filter(
          (participant) => participant?.is_active !== false && !participant?.left_at
        )
        setParticipants(activeParticipants)
      }
    } catch (err) {
      console.error('Failed to load participants', err)
    }
  }

  const subscribeToUpdates = () => {
    if (!sessionId) return

    const participantsSubscription = SessionService.subscribeToParticipants(sessionId, () => {
      loadParticipants()
    })

    const sessionSubscription = SessionService.subscribeToSession(sessionId, (payload) => {
      if (payload.new?.current_question) {
        onNavigate('play-quiz', {
          sessionData: { session: payload.new, participant: sessionData.participant }
        })
      } else if (payload.eventType === 'DELETE' || !payload.new) {
        alert('Session ended by host.')
        onNavigate('guest-welcome')
      }
    })

    return () => {
      participantsSubscription?.unsubscribe()
      sessionSubscription?.unsubscribe()
    }
  }

  const guestNickname = sessionData?.participant?.nickname || user?.nickname || 'Guest'

  const handleLeaveSession = async () => {
    if (!sessionId || !participantId) {
      onNavigate('guest-welcome')
      return
    }

    try {
      setLeaving(true)
      const { error: leaveError } = await SessionService.leaveSession(sessionId, participantId)
      if (leaveError) {
        setError('Failed to leave session. Please try again.')
        setLeaving(false)
        return
      }
      setLeaving(false)
      onNavigate('guest-welcome')
    } catch (err) {
      setError('Failed to leave session. Please try again.')
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-emerald-200 border-t-transparent"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 p-6">
        <div className="absolute inset-0 bg-black/30" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mx-auto max-w-md rounded-3xl bg-white/85 p-8 text-center text-emerald-900 shadow-2xl backdrop-blur"
        >
          <div className="mb-4 text-5xl">❌</div>
          <h2 className="mb-3 text-2xl font-bold">Oops!</h2>
          <p className="mb-6 text-emerald-600">{error}</p>
          <button
            onClick={() => onNavigate('guest-welcome')}
            className="rounded-full bg-emerald-500 px-6 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-400"
          >
            Back to Welcome
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={bgSession} alt="Fairy tale background" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl bg-white/90 p-8 text-center shadow-[0_45px_90px_-35px_rgba(0,0,0,0.55)] backdrop-blur"
        >
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white bg-white/80 text-5xl shadow-lg">
            🙂
          </div>
          <h2 className="text-xl font-semibold text-slate-800">{guestNickname}</h2>
          <p className="mt-1 text-sm font-medium text-emerald-600">Waiting for host to start the quiz…</p>

          <div className="mt-6 flex justify-center gap-3 text-sm">
            <button
              onClick={loadParticipants}
              className="rounded-full bg-white/70 px-5 py-2 font-semibold text-slate-700 transition hover:bg-white"
            >
              Refresh
            </button>
            <button
              onClick={handleLeaveSession}
              disabled={leaving}
              className="rounded-full bg-[#FF8A24] px-5 py-2 font-semibold text-white transition hover:bg-[#ff9e4b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {leaving ? 'Leaving…' : 'Leave Room'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
