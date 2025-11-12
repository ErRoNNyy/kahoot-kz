import React from 'react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getUserDisplayName, getUserAvatar } from '../utils/userHelpers'

interface AppHeaderProps {
  user: any
  onNavigate: (page: string, data?: any) => void
  onSignOut: () => Promise<void>
}

const navigationItems = [
  { key: 'create', label: 'Create Quiz', page: 'create-quiz' },
  { key: 'host', label: 'Host Session', page: 'host-session' },
  { key: 'join', label: 'Join Session', page: 'join-session' },
]

export function AppHeader({ user, onNavigate, onSignOut }: AppHeaderProps) {
  const handleBrandClick = () => {
    onNavigate('dashboard')
  }

  const handleSignOut = async () => {
    await onSignOut()
  }

  return (
    <header className="bg-emerald-900/95 backdrop-blur shadow-sm border-b-4 border-emerald-500/70">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-10">
            <button
              type="button"
              onClick={handleBrandClick}
              className="flex items-center gap-4 text-left"
              style={{ cursor: 'pointer' }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl text-emerald-100 shadow-inner">
                🧠
              </div>
              <div>
                <p className="text-2xl font-bold text-white">Zharqyn</p>
                <p className="text-sm font-medium uppercase tracking-widest text-emerald-200">
                  Interactive learning hub
                </p>
              </div>
            </button>
            <nav className="hidden items-center gap-8 text-lg font-semibold text-emerald-100 md:flex">
              {navigationItems.map((item) => (
                <motion.button
                  key={item.key}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  className="transition-colors hover:text-white"
                >
                  {item.label}
                </motion.button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-3 rounded-full border border-emerald-400/60 bg-emerald-800/70 px-4 py-2 text-sm font-semibold text-emerald-100 md:flex">
              <span>{getUserAvatar(user)}</span>
              <span>{getUserDisplayName(user)}</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('profile')}
              className="text-lg font-semibold text-emerald-100 transition-colors hover:text-white"
            >
              Profile
            </button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleSignOut}
              className="rounded-full bg-emerald-400 px-8 py-2.5 text-lg font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-300"
            >
              Sign Out
            </motion.button>
          </div>
        </div>
        <nav className="grid gap-2 pb-4 md:hidden sm:grid-cols-3">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.page)}
              className="rounded-lg border border-emerald-300/70 bg-emerald-800/60 px-4 py-2 text-left text-lg font-semibold text-emerald-100 transition-colors hover:border-emerald-200 hover:bg-emerald-700/60"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
