import React, { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { motion } from 'framer-motion'
import './App.css'

// Import pages
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import QuizCreationPage from './pages/QuizCreationPage'
import SessionHostPage from './pages/SessionHostPage'
import SessionJoinPage from './pages/SessionJoinPage'
import QuizPlayPage from './pages/QuizPlayPage'
import GuestWelcomePage from './pages/GuestWelcomePage'
import GuestJoinPage from './pages/GuestJoinPage'
import GuestWaitingPage from './pages/GuestWaitingPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  const { user, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('login')
  const [sessionData, setSessionData] = useState(null)
  const [editQuizData, setEditQuizData] = useState<{ quizId: string } | null>(null)

  // Reset page to login when user becomes null (after sign out)
  React.useEffect(() => {
    if (!user && currentPage !== 'login') {
      console.log('User became null, resetting to login page')
      setCurrentPage('login')
    }
  }, [user, currentPage])

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
    if (page === 'create-quiz' && data?.editQuizId) {
      setEditQuizData({ quizId: data.editQuizId })
    } else {
      setEditQuizData(null)
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
