import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { SessionService } from '../services/session.js'
import bgSession from '../assets/bg_session.png'
import avatarBrownMouse from '../assets/avatars/brown_mouse.png'
import avatarGrayKoala from '../assets/avatars/gray_coala.png'
import avatarGreenDragon from '../assets/avatars/green_dragon.png'
import avatarMonkey from '../assets/avatars/monkey.png'
import avatarOrangeCat from '../assets/avatars/orange_cat.png'
import avatarPanda from '../assets/avatars/panda.png'
import avatarRedParrot from '../assets/avatars/red_parrot.png'
import avatarSkunk from '../assets/avatars/skuns.png'
import avatarWhiteBear from '../assets/avatars/white_bear.png'
import avatarYellowBear from '../assets/avatars/yellow_bear.png'

const AVATAR_OPTIONS = [
  { id: 'brown_mouse', label: 'Mouse', image: avatarBrownMouse },
  { id: 'gray_coala', label: 'Koala', image: avatarGrayKoala },
  { id: 'green_dragon', label: 'Dragon', image: avatarGreenDragon },
  { id: 'monkey', label: 'Monkey', image: avatarMonkey },
  { id: 'orange_cat', label: 'Cat', image: avatarOrangeCat },
  { id: 'panda', label: 'Panda', image: avatarPanda },
  { id: 'red_parrot', label: 'Parrot', image: avatarRedParrot },
  { id: 'skuns', label: 'Skunk', image: avatarSkunk },
  { id: 'white_bear', label: 'Polar Bear', image: avatarWhiteBear },
  { id: 'yellow_bear', label: 'Bear', image: avatarYellowBear }
]

export default function GuestWaitingPage({ sessionData, onNavigate }) {
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [pendingAvatar, setPendingAvatar] = useState(sessionData?.participant?.avatar || '')
  const [quizAvailable, setQuizAvailable] = useState(
    Boolean(sessionData?.session?.current_question)
  )
  const [selectedAvatar, setSelectedAvatar] = useState(
    sessionData?.participant?.avatar || ''
  )
  const [readyToJoin, setReadyToJoin] = useState(false)

  const avatarLookup = useMemo(() => {
    return AVATAR_OPTIONS.reduce((acc, option) => {
      acc[option.id] = option
      return acc
    }, {})
  }, [])

  const currentAvatar = selectedAvatar ? avatarLookup[selectedAvatar] : null
  const activeParticipants = useMemo(
    () =>
      participants.filter(
        (participant) => participant?.is_active !== false && !participant?.left_at
      ),
    [participants]
  )

  useEffect(() => {
    if (sessionData?.participant?.avatar) {
      setSelectedAvatar(sessionData.participant.avatar)
    }
  }, [sessionData?.participant?.avatar])

  useEffect(() => {
    if (!showAvatarPicker) {
      setPendingAvatar(selectedAvatar || '')
    }
  }, [selectedAvatar, showAvatarPicker])

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
        setQuizAvailable(Boolean(data?.current_question))
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

        const currentParticipant = activeParticipants.find(
          (participant) => participant?.id === participantId
        )

        if (currentParticipant?.avatar) {
          setSelectedAvatar(currentParticipant.avatar)
        }
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
      if (payload.eventType === 'DELETE' || !payload.new) {
        alert('Session ended by host.')
        onNavigate('guest-welcome')
        return
      }

      setSession(payload.new)

      if (payload.new.current_question) {
        setQuizAvailable(true)
        setInfoMessage(
          readyToJoin
            ? 'The host has started the quiz! Taking you to the game…'
            : 'The host has started the quiz! Press “To the game” to join.'
        )
      } else {
        setQuizAvailable(false)
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

  const handleAvatarSave = async () => {
    if (!sessionId || !participantId) {
      setAvatarError('Missing session information. Please rejoin the session.')
      return
    }

    if (!pendingAvatar) {
      setAvatarError('Please choose an avatar.')
      return
    }

    if (pendingAvatar === selectedAvatar) {
      setShowAvatarPicker(false)
      return
    }

    try {
      setSavingAvatar(true)
      setAvatarError('')
      setInfoMessage('')

      const { error: updateError } = await SessionService.updateParticipant(sessionId, participantId, {
        avatar: pendingAvatar
      })

      if (updateError) {
        setAvatarError('Failed to update avatar. Please try again.')
        return
      }

      setSelectedAvatar(pendingAvatar)
      if (sessionData?.participant) {
        sessionData.participant.avatar = pendingAvatar
      }
      setInfoMessage('Avatar saved! You are ready for the game.')
      setShowAvatarPicker(false)
    } catch (err) {
      console.error('Failed to update avatar:', err)
      setAvatarError('Failed to update avatar. Please try again.')
    } finally {
      setSavingAvatar(false)
    }
  }

  const goToPlay = (overrideSession = null) => {
    const nextSession = overrideSession || session || sessionData?.session || { id: sessionId }
    const participant = {
      ...(sessionData?.participant || {}),
      avatar: selectedAvatar
    }

    onNavigate('play-quiz', {
      sessionData: {
        session: nextSession,
        participant
      }
    })
  }

  const handleProceedToGame = () => {
    if (!selectedAvatar) {
      setAvatarError('Pick your avatar before joining the game.')
      setInfoMessage('')
      return
    }

    if (!quizAvailable) {
      setReadyToJoin(true)
      setInfoMessage('')
      return
    }

    setReadyToJoin(false)
    goToPlay()
  }

  useEffect(() => {
    if (quizAvailable && selectedAvatar && readyToJoin) {
      setReadyToJoin(false)
      goToPlay()
    }
  }, [quizAvailable, selectedAvatar, readyToJoin])

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

  const sessionCode =
    session?.code ||
    sessionData?.session?.code ||
    sessionData?.code ||
    sessionId

  const quizTitle =
    session?.quizzes?.title ||
    sessionData?.session?.quizzes?.title ||
    'Quiz Room'

  if (readyToJoin && !quizAvailable) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <img src={bgSession} alt="Fairy tale background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />

        <button
          onClick={handleLeaveSession}
          disabled={leaving}
          className="absolute right-6 top-6 z-20 rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-[#EF7C1D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {leaving ? 'Leaving…' : 'Leave room'}
        </button>

        <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl space-y-8 lg:space-y-0 lg:space-x-8 lg:flex lg:items-stretch"
          >
            <div className="flex-1 rounded-[2.5rem] border border-white/15 bg-white/92 p-10 text-center shadow-[0_40px_90px_-50px_rgba(0,0,0,0.6)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">Quiz code</p>
              <p className="mt-3 text-5xl font-black text-slate-900 tracking-[0.12em]">{sessionCode}</p>

              <div className="mt-6 inline-block rounded-full bg-black/85 px-6 py-2 text-sm font-semibold text-white shadow-lg">
                {quizTitle}
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-yellow-200/90 px-5 py-2 text-sm font-semibold text-slate-800 shadow">
                <span>Waiting for host to start…</span>
              </div>

              <div className="mt-10">
                {activeParticipants.length === 0 ? (
                  <div className="rounded-2xl bg-white/85 px-8 py-10 text-slate-600 shadow-inner">
                    <span className="text-4xl">👋</span>
                    <p className="mt-3 font-semibold">You are the first adventurer here!</p>
                    <p className="text-sm text-slate-500">Stay tuned while others join.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {activeParticipants.map((participant) => {
                      const avatar = participant.avatar ? avatarLookup[participant.avatar] : null
                      return (
                        <div
                          key={participant.id}
                          className="flex flex-col items-center rounded-2xl bg-white/85 px-4 py-5 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.55)]"
                        >
                          <div className="mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#FFF4E6]">
                            {avatar ? (
                              <img src={avatar.image} alt={avatar.label} className="h-full w-full object-contain" />
                            ) : (
                              <span className="text-3xl text-slate-500">{(participant.nickname || 'Guest')[0] || '?'}</span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">
                            {participant.nickname || 'Guest'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/85 p-6 text-left shadow-[0_30px_70px_-55px_rgba(0,0,0,0.65)] backdrop-blur lg:mt-0 lg:w-[18rem]">
              <h3 className="text-xl font-bold text-slate-900">
                Players ({activeParticipants.length})
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                We will move you to the game as soon as the host starts.
              </p>

              <div className="mt-6 space-y-3">
                {activeParticipants.length === 0 ? (
                  <div className="rounded-xl bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                    Waiting for other players to join…
                  </div>
                ) : (
                  activeParticipants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between rounded-xl bg-white/80 px-4 py-3 shadow-inner"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFCE3A] text-sm font-bold text-slate-900">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold text-slate-800">
                          {participant.nickname || 'Guest'}
                        </div>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        ready
                      </span>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setShowAvatarPicker(true)
                  setPendingAvatar(selectedAvatar || AVATAR_OPTIONS[0]?.id || '')
                }}
                className="mt-6 w-full rounded-full bg-[#FF8A24] py-2 text-sm font-semibold text-white transition hover:bg-[#ff9c45]"
              >
                Change avatar
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <img src={bgSession} alt="Fairy tale background" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/55" />

      <button
        onClick={handleLeaveSession}
        disabled={leaving}
        className="absolute right-6 top-6 z-20 rounded-full bg-white/80 px-5 py-2 text-sm font-semibold text-[#EF7C1D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {leaving ? 'Leaving…' : 'Leave room'}
      </button>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm rounded-3xl bg-white/95 p-10 text-center shadow-[0_45px_90px_-35px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-gradient-to-br from-[#FFE9D6] via-white to-[#FFF7EE] shadow-lg">
            {currentAvatar ? (
              <img src={currentAvatar.image} alt={currentAvatar.label} className="h-full w-full object-cover" />
            ) : (
              <span className="text-5xl">🙂</span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{guestNickname}</h2>
          <p className="mt-2 text-sm font-medium text-emerald-600">
            {quizAvailable ? 'The game is ready! Press “To the game” when you are set.' : 'Waiting for host to start the quiz…'}
          </p>
          {participants.length > 1 && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {participants.length} players in the room
            </p>
          )}

          {avatarError && !showAvatarPicker && (
            <div className="mt-4 rounded-lg bg-red-100/90 px-4 py-2 text-sm font-semibold text-red-600">
              {avatarError}
            </div>
          )}

          {infoMessage && (
            <div className="mt-4 rounded-lg bg-emerald-100/90 px-4 py-2 text-sm font-semibold text-emerald-700">
              {infoMessage}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 text-sm">
            <button
              onClick={() => {
                setAvatarError('')
                setInfoMessage('')
                setPendingAvatar(selectedAvatar || AVATAR_OPTIONS[0]?.id || '')
                setShowAvatarPicker(true)
              }}
              disabled={savingAvatar}
              className="rounded-full bg-white/80 px-5 py-3 font-semibold text-[#EF7C1D] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingAvatar ? 'Saving…' : selectedAvatar ? 'Change avatar' : 'Choose avatar'}
            </button>
            <button
              onClick={handleProceedToGame}
              disabled={!selectedAvatar || savingAvatar}
              className="rounded-full bg-[#FF8A24] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#ff9e4b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              To the game
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showAvatarPicker && (
          <motion.div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-2xl"
            >
              <h3 className="mb-6 text-center text-2xl font-semibold text-slate-900">
                Choose your avatar
              </h3>

              {avatarError && (
                <div className="mb-4 text-center text-sm font-semibold text-red-500">
                  {avatarError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {AVATAR_OPTIONS.map((avatar) => {
                  const isSelected = pendingAvatar === avatar.id
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => setPendingAvatar(avatar.id)}
                      disabled={savingAvatar}
                      className={`relative flex aspect-square items-center justify-center rounded-2xl bg-[#F5F5F5] transition hover:bg-[#EBEBEB] disabled:cursor-not-allowed ${
                        isSelected ? 'border-[3px] border-black' : 'border-2 border-transparent'
                      }`}
                    >
                      <img src={avatar.image} alt={avatar.label} className="h-[70px] w-[70px] object-contain" />
                    </button>
                  )
                })}
              </div>

              <div className="mt-8 flex items-center justify-center">
                <button
                  onClick={handleAvatarSave}
                  disabled={savingAvatar}
                  className="rounded-full bg-black px-8 py-2 text-sm font-semibold text-white transition hover:bg-[#1E1E1E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAvatar ? 'Saving…' : 'Done'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
