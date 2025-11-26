import React from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

// @ts-ignore - Avatar imports
import avatarOrangeCat from '../assets/avatars/orange_cat.png'

interface AppHeaderProps {
  user: any
  onNavigate: (page: string) => void
  onSignOut: () => void
}

export function AppHeader({ user, onNavigate, onSignOut }: AppHeaderProps) {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    onSignOut()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-700/30 bg-emerald-900/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-400">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Zharqyn</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Interactive Learning Hub
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <button
            onClick={() => onNavigate('create-quiz')}
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Create Quiz
          </button>
          <button
            onClick={() => onNavigate('host-session')}
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Host Session
          </button>
          <button
            onClick={() => onNavigate('join-session')}
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Join Session
          </button>
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 rounded-full bg-emerald-800/60 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700/60"
          >
            <img
              src={avatarOrangeCat}
              alt="Avatar"
              className="h-6 w-6 rounded-full object-cover"
            />
            <span>{user?.email?.split('@')[0] || 'User'}</span>
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Profile
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-300"
          >
            Sign Out
          </motion.button>
        </div>
      </div>
    </header>
  )
}

