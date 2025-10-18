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
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-gray-800 mb-2"
            >
              Kahoot KZ
            </motion.h1>
            <p className="text-gray-600">Create and play interactive quizzes</p>
          </div>

          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => handleModeSwitch(true)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                isLogin ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => handleModeSwitch(false)}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                !isLogin ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your display name"
                  required={!isLogin}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This is how your name will appear to other users
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                required={isLogin}
              />
              {validationErrors.email && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
                {!isLogin && (
                  <span className="text-xs text-gray-500 ml-2">
                    (8+ chars, uppercase, lowercase, number, special char)
                  </span>
                )}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                required={isLogin}
              />
              {validationErrors.password && (
                <div className="mt-1">
                  {Array.isArray(validationErrors.password) ? (
                    <ul className="text-red-500 text-sm list-disc list-inside">
                      {validationErrors.password.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-500 text-sm">{validationErrors.password}</p>
                  )}
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  required={!isLogin}
                />
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.confirmPassword}</p>
                )}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || Object.keys(validationErrors).length > 0}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
            </motion.button>
          </form>

          {/* Forgot Password Link - Only show on login mode */}
          {isLogin && !showPasswordReset && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowPasswordReset(true)}
                className="text-sm text-purple-600 hover:text-purple-700 underline"
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
              className="mt-6 pt-4 border-t border-gray-200"
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Reset Password</h3>
                <p className="text-sm text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={passwordResetEmail}
                    onChange={(e) => setPasswordResetEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePasswordReset}
                    disabled={loading}
                    className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue as guest</span>
              </div>
            </div>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Continue as Guest'}
              </motion.button>
            </div>
          </div>

          {/* Resend Confirmation - Show only when email confirmation was sent */}
          {!isLogin && emailConfirmationSent && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-center mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  Didn't receive the email?
                </p>
                <button
                  onClick={resendConfirmation}
                  disabled={loading}
                  className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
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
