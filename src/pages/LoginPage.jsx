import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { AuthService } from '../services/auth.js'
import supabase from '../utils/supabase'

export default function LoginPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordResetEmail, setPasswordResetEmail] = useState('')

  const { signUp, signIn, signInAsGuest } = useAuth()

  // Reset confirmation state when switching between login/signup
  const handleModeSwitch = (isLoginMode) => {
    setIsLogin(isLoginMode)
    setEmailConfirmationSent(false)
    setShowPasswordReset(false)
    setError('')
    setSuccess('')
  }

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password validation function
  const validatePassword = (password) => {
    const errors = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    return errors
  }

  // Real-time validation
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value })
    
    const errors = { ...validationErrors }
    
    if (field === 'email' && value) {
      if (!validateEmail(value)) {
        errors.email = 'Please enter a valid email address'
      } else {
        delete errors.email
      }
    }
    
    if (field === 'password' && value) {
      const passwordErrors = validatePassword(value)
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors
      } else {
        delete errors.password
      }
    }
    
    if (field === 'confirmPassword' && value) {
      if (value !== formData.password) {
        errors.confirmPassword = 'Passwords do not match'
      } else {
        delete errors.confirmPassword
      }
    }
    
    setValidationErrors(errors)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Validate password strength for sign up
    if (!isLogin) {
      const passwordErrors = validatePassword(formData.password)
      if (passwordErrors.length > 0) {
        setError(`Password requirements not met: ${passwordErrors.join(', ')}`)
        setLoading(false)
        return
      }

      // Validate password confirmation
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
    }

    try {
      let result
      if (isLogin) {
        result = await signIn(formData.email, formData.password)
        
        // Check if login failed due to unconfirmed email
        if (result.error && result.error.message.includes('email not confirmed')) {
          setError('Please confirm your email before logging in. Check your email for the confirmation link.')
          setEmailConfirmationSent(true)
          setLoading(false)
          return
        }
      } else {
        result = await signUp(formData.email, formData.password, formData.displayName)
      }

      if (result.error) {
        setError(result.error.message)
      } else {
        // Check if user is automatically signed in (has session)
        if (result.data?.session) {
          // User is automatically signed in
          onLogin()
        } else if (result.data?.user && !result.data.user.email_confirmed_at) {
          // User created but needs email confirmation
          setEmailConfirmationSent(true)
          setSuccess('✅ Account created! Please check your email (including spam folder) for the confirmation link.')
        } else {
          // Fallback
          onLogin()
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    console.log('LoginPage.handleGuestLogin called - no nickname required')
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Generate a default nickname for guest
      const defaultNickname = `Guest${Math.floor(Math.random() * 1000)}`
      console.log('Using default nickname:', defaultNickname)
      
      const result = await signInAsGuest(defaultNickname)
      console.log('LoginPage guest login result:', result)
      
      if (result.error) {
        console.error('Guest login error:', result.error)
        setError(result.error.message || 'Failed to login as guest')
      } else {
        console.log('Guest login successful, calling onLogin()')
        // For guests, we need to navigate to guest-welcome instead of dashboard
        window.location.reload() // Force refresh to trigger guest flow
      }
    } catch (err) {
      console.error('Guest login exception:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resendConfirmation = async () => {
    if (!formData.email) {
      setError('Please enter your email first')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const { data, error } = await AuthService.resendConfirmation(formData.email)
      
      if (error) {
        setError(`Failed to resend: ${error.message}`)
      } else {
        setSuccess('✅ Confirmation email resent! Check your email (including spam folder).')
      }
    } catch (err) {
      setError('Failed to resend confirmation email')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!passwordResetEmail) {
      setError('Please enter your email address')
      return
    }

    if (!validateEmail(passwordResetEmail)) {
      setError('Please enter a valid email address')
      return
    }
    
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      const { data, error } = await AuthService.resetPassword(passwordResetEmail)
      
      if (error) {
        setError(`Failed to send reset email: ${error.message}`)
      } else {
        setSuccess('✅ Password reset email sent! Check your email (including spam folder) for instructions.')
        setShowPasswordReset(false)
        setPasswordResetEmail('')
      }
    } catch (err) {
      setError('Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-600 px-4 py-10">
      <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-20 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto w-full max-w-md"
      >
        <div className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/90 via-white/80 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-2 text-3xl font-bold text-emerald-900"
            >
              Zharqyn
            </motion.h1>
            <p className="text-emerald-600">Create and play interactive quizzes</p>
          </div>

          <div className="mb-6 flex rounded-xl bg-emerald-100/60 p-1">
            <button
              onClick={() => handleModeSwitch(true)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                isLogin ? 'bg-white text-emerald-600 shadow' : 'text-emerald-500'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleModeSwitch(false)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                !isLogin ? 'bg-white text-emerald-600 shadow' : 'text-emerald-500'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-emerald-900"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-800">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                  placeholder="Enter your display name"
                  required={!isLogin}
                />
                <p className="mt-1 text-xs text-emerald-600">
                  This is how your name will appear to other users
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-800">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                  validationErrors.email ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-200/60 bg-white/85 text-emerald-900 shadow-inner'
                }`}
                placeholder="Enter your email"
                required={isLogin}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-500">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-emerald-800">
                Password
                {!isLogin && (
                  <span className="ml-2 text-xs text-emerald-600">
                    (8+ chars, uppercase, lowercase, number, special char)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                  validationErrors.password ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-200/60 bg-white/85 text-emerald-900 shadow-inner'
                }`}
                placeholder="Enter your password"
                required={isLogin}
              />
              {validationErrors.password && (
                <div className="mt-1">
                  {Array.isArray(validationErrors.password) ? (
                    <ul className="list-inside list-disc text-sm text-red-500">
                      {validationErrors.password.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-red-500">{validationErrors.password}</p>
                  )}
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="mb-1 block text-sm font-medium text-emerald-800">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                    validationErrors.confirmPassword ? 'border-red-300 bg-red-50 text-red-700' : 'border-emerald-200/60 bg-white/85 text-emerald-900 shadow-inner'
                  }`}
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || Object.keys(validationErrors).length > 0}
              className="w-full rounded-full bg-emerald-500 py-3 px-4 text-lg font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </motion.button>
          </form>

          {/* Forgot Password Link - Only show on login mode */}
          {isLogin && !showPasswordReset && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowPasswordReset(true)}
                className="text-sm text-emerald-600 underline transition-colors hover:text-emerald-700"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {/* Password Reset Form */}
          {showPasswordReset && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 border-t border-emerald-100/80 pt-4"
            >
              <div className="mb-4 text-center">
                <h3 className="mb-2 text-lg font-medium text-emerald-900">Reset Password</h3>
                <p className="text-sm text-emerald-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-emerald-800">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={passwordResetEmail}
                    onChange={(e) => setPasswordResetEmail(e.target.value)}
                    className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePasswordReset}
                    disabled={loading}
                    className="flex-1 rounded-full bg-emerald-500 py-3 px-4 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowPasswordReset(false)
                      setPasswordResetEmail('')
                      setError('')
                      setSuccess('')
                    }}
                    className="rounded-full bg-emerald-200 py-3 px-4 font-semibold text-emerald-800 transition-colors hover:bg-emerald-300"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-100/80" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-transparent px-2 text-emerald-600">Or continue as guest</span>
              </div>
            </div>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full rounded-full bg-emerald-900/80 py-3 px-4 text-lg font-semibold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Continue as Guest'}
              </motion.button>
            </div>
          </div>

          {/* Resend Confirmation - Show only when email confirmation was sent */}
          {!isLogin && emailConfirmationSent && (
            <div className="mt-6 border-t border-emerald-100/80 pt-4">
              <div className="mb-3 text-center">
                <p className="mb-2 text-sm text-emerald-600">
                  Didn't receive the email?
                </p>
                <button
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="w-full rounded-full bg-emerald-500 py-2 px-4 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Resend Confirmation Email'}
                </button>
              </div>
              <div className="text-center">
                <button
                  onClick={() => {
                    setEmailConfirmationSent(false)
                    setSuccess('')
                    setError('')
                  }}
                  className="text-sm text-emerald-600 underline transition-colors hover:text-emerald-800"
                >
                  Back to Sign Up
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
