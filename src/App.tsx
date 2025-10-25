import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { motion } from 'framer-motion'
import { SessionService } from './services/session'
import './App.css'

// Import pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import QuizCreationPage from './pages/QuizCreationPage'
import SessionHostPage from './pages/SessionHostPage'
import SessionJoinPage from './pages/SessionJoinPage'
import QuizPlayPage from './pages/QuizPlayPage'
import QuizHostControlPage from './pages/QuizHostControlPage'
import GuestWelcomePage from './pages/GuestWelcomePage'
import GuestJoinPage from './pages/GuestJoinPage'
import GuestWaitingPage from './pages/GuestWaitingPage'
import ProfilePage from './pages/ProfilePage'

// Define session data type
interface SessionData {
  id: string
  quiz_id: string
  host_id: string
  code: string
  status: string
  created_at: string
}

function App() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('login')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [editQuizData, setEditQuizData] = useState<{ quizId: string } | null>(null)

  // Reset page to login when user becomes null (after sign out)
  React.useEffect(() => {
    if (!user && currentPage !== 'login') {
      console.log('User became null, resetting to login page')
      setCurrentPage('login')
    }
  }, [user, currentPage])

  // Clean up session on page unload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionData?.id) {
        console.log('Page unloading, cleaning up session:', sessionData.id)
        SessionService.cleanupSession(sessionData.id)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={() => setCurrentPage('dashboard')} />
  }

  // Check if user is guest and redirect to guest welcome
  if (user && (user as any).isGuest && currentPage === 'dashboard') {
    setCurrentPage('guest-welcome')
  }

  const handleNavigation = (page: string, data: any = null) => {
    // Clean up session data when navigating away from session pages (but not to quiz-related pages)
    if (currentPage === 'host-session' || currentPage === 'join-session' || currentPage === 'play-quiz' || currentPage === 'guest-waiting') {
      // Don't clear sessionData if navigating to quiz-related pages
      if (!['play-quiz', 'quiz-host-control', 'guest-waiting'].includes(page)) {
        if (sessionData?.id) {
          console.log('Cleaning up session on navigation:', sessionData.id)
          SessionService.cleanupSession(sessionData.id)
        }
        setSessionData(null)
      }
    }

    if (page === 'create-quiz' && data?.editQuizId) {
      setEditQuizData({ quizId: data.editQuizId })
    } else {
      setEditQuizData(null)
    }

    // Handle sessionData parameter for quiz-related pages
    if ((page === 'quiz-host-control' || page === 'play-quiz') && data?.sessionData) {
      console.log('App.tsx: Setting sessionData for', page, ':', data.sessionData)
      setSessionData(data.sessionData)
    }

    setCurrentPage(page)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigation} />
      case 'create-quiz':
        return <QuizCreationPage onNavigate={setCurrentPage} editQuizData={editQuizData} />
      case 'host-session':
        return <SessionHostPage onNavigate={setCurrentPage} onSessionCreated={setSessionData} />
      case 'join-session':
        return <SessionJoinPage onNavigate={setCurrentPage} onSessionJoined={setSessionData} />
      case 'play-quiz':
        return <QuizPlayPage sessionData={sessionData} onNavigate={setCurrentPage} />
      case 'quiz-host-control':
        console.log('App.tsx: Rendering QuizHostControlPage with sessionData:', sessionData)
        return <QuizHostControlPage sessionData={sessionData} onNavigate={setCurrentPage} />
      case 'profile':
        return <ProfilePage onNavigate={setCurrentPage} />
      case 'guest-welcome':
        return <GuestWelcomePage onNavigate={setCurrentPage} />
      case 'guest-join':
        return <GuestJoinPage onNavigate={setCurrentPage} onSessionJoined={setSessionData} />
      case 'guest-waiting':
        return <GuestWaitingPage sessionData={sessionData} onNavigate={setCurrentPage} />
      default:
        return user && (user as any).isGuest ? 
          <GuestWelcomePage onNavigate={setCurrentPage} /> : 
          <DashboardPage onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600">
      {renderPage()}
    </div>
  )
}

export default App
