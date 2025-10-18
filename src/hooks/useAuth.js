import { useState, useEffect } from 'react'
import { AuthService } from '../services/auth'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial user
    const getInitialUser = async () => {
      const currentUser = await AuthService.getCurrentUser()
      setUser(currentUser)
      setLoading(false)
    }

    getInitialUser()

    // Set up guest cleanup on page unload
    const cleanupGuestOnUnload = AuthService.setupGuestCleanupOnUnload()

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', { event, session })
        
        // Check if we have a guest user first
        const guestUser = localStorage.getItem('guest_user')
        if (guestUser) {
          console.log('Guest user exists, not overriding with auth state change')
          setLoading(false)
          return
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setUser(session?.user || null)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
      cleanupGuestOnUnload()
    }
  }, [])

  const signUp = async (email, password, username) => {
    const { data, error } = await AuthService.signUp(email, password, username)
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await AuthService.signIn(email, password)
    return { data, error }
  }

  const signInAsGuest = async (nickname) => {
    console.log('useAuth.signInAsGuest called with nickname:', nickname)
    const { data, error } = await AuthService.signInAsGuest(nickname)
    console.log('AuthService.signInAsGuest result:', { data, error })
    
    if (!error) {
      console.log('Setting guest user:', data.user)
      setUser(data.user)
    } else {
      console.error('Guest login error:', error)
    }
    return { data, error }
  }

  const signOut = async () => {
    console.log('useAuth.signOut called')
    const { error } = await AuthService.signOut()
    if (!error) {
      console.log('Setting user to null after sign out')
      setUser(null)
    } else {
      console.error('Sign out error:', error)
    }
    return { error }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signInAsGuest,
    signOut
  }
}
