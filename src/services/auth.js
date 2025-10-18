import supabase from '../utils/supabase'
import { SessionService } from './session'

export class AuthService {
  // Sign up with email and password
  static async signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: displayName
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    return { data, error }
  }

  // Sign in with email and password
  static async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  // Sign in as guest with nickname
  static async signInAsGuest(nickname) {
    console.log('AuthService.signInAsGuest called with nickname:', nickname)
    
    // Generate a proper UUID for guest users
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }
    
    // For guest users, we'll store their info in localStorage
    // and use a proper UUID for the user ID
    const guestUser = {
      id: generateUUID(),
      nickname,
      isGuest: true
    }
    
    console.log('Creating guest user:', guestUser)
    localStorage.setItem('guest_user', JSON.stringify(guestUser))
    console.log('Guest user stored in localStorage')
    
    const result = { data: { user: guestUser }, error: null }
    console.log('AuthService.signInAsGuest returning:', result)
    return result
  }

  // Sign out
  static async signOut() {
    console.log('AuthService.signOut called')
    
    // Check if current user is a guest
    const guestUser = localStorage.getItem('guest_user')
    if (guestUser) {
      const parsedGuestUser = JSON.parse(guestUser)
      console.log('Cleaning up guest user data:', parsedGuestUser.id)
      
      // Clean up guest user data from database
      await this.cleanupGuestUserData(parsedGuestUser.id)
    } else {
      // For authenticated users, clean up their sessions
      const currentUser = await this.getCurrentUser()
      if (currentUser && !currentUser.isGuest) {
        console.log('Cleaning up user sessions:', currentUser.id)
        await this.cleanupUserSessions(currentUser.id)
      }
    }
    
    const { error } = await supabase.auth.signOut()
    localStorage.removeItem('guest_user')
    console.log('Guest user removed from localStorage')
    return { error }
  }

  // Clean up guest user data from database
  static async cleanupGuestUserData(guestId) {
    try {
      console.log('Cleaning up guest user data for ID:', guestId)
      
      // Use SessionService to clean up guest data
      const { error } = await SessionService.cleanupGuestUser(guestId)
      
      if (error) {
        console.error('Error during guest user cleanup:', error)
      } else {
        console.log('Guest user data cleanup completed successfully')
      }
    } catch (err) {
      console.error('Error during guest user cleanup:', err)
    }
  }

  // Clean up user sessions from database
  static async cleanupUserSessions(userId) {
    try {
      console.log('Cleaning up user sessions for ID:', userId)
      
      // Use SessionService to clean up user sessions
      const { error } = await SessionService.cleanupUserSessions(userId)
      
      if (error) {
        console.error('Error during user sessions cleanup:', error)
      } else {
        console.log('User sessions cleanup completed successfully')
      }
    } catch (err) {
      console.error('Error during user sessions cleanup:', err)
    }
  }

  // Clean up guest data on page unload (for cases where signOut isn't called)
  static setupGuestCleanupOnUnload() {
    const handleBeforeUnload = () => {
      const guestUser = localStorage.getItem('guest_user')
      if (guestUser) {
        const parsedGuestUser = JSON.parse(guestUser)
        console.log('Page unloading, cleaning up guest user:', parsedGuestUser.id)
        
        // Use sendBeacon for reliable cleanup on page unload
        if (navigator.sendBeacon) {
          // This is a fire-and-forget cleanup
          SessionService.cleanupGuestUser(parsedGuestUser.id)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }

  // Get current user
  static async getCurrentUser() {
    console.log('AuthService.getCurrentUser called')
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Supabase user:', user)
    
    // Check if it's a guest user
    const guestUser = localStorage.getItem('guest_user')
    console.log('Guest user from localStorage:', guestUser)
    
    if (!user && guestUser) {
      const parsedGuestUser = JSON.parse(guestUser)
      console.log('Returning guest user:', parsedGuestUser)
      return parsedGuestUser
    }
    
    console.log('Returning regular user:', user)
    return user
  }

  // Get current session
  static async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  // Listen to auth changes
  static onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // Resend confirmation email
  static async resendConfirmation(email) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { data, error }
  }

  // Verify OTP (for email confirmation)
  static async verifyOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    })
    return { data, error }
  }

  // Get user session (useful for checking confirmation status)
  static async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  }

  // Update user profile
  static async updateProfile(profileData) {
    const { data, error } = await supabase.auth.updateUser({
      data: profileData
    })
    return { data, error }
  }

  // Upload avatar to Supabase Storage
  static async uploadAvatar(file, userId) {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      return { data: { publicUrl }, error: null }
    } catch (err) {
      console.error('Avatar upload error:', err)
      return { data: null, error: err }
    }
  }

  // Get user profile data
  static async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    return { data, error }
  }

  // Send password reset email
  static async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`
    })
    return { data, error }
  }

  // Update password (for authenticated users)
  static async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }
}
