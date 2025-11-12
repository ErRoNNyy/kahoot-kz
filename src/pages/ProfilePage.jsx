import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.js'
import { AuthService } from '../services/auth.js'
import { getUserDisplayName } from '../utils/userHelpers.js'
import supabase from '../utils/supabase'

export default function ProfilePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileData, setProfileData] = useState({
    displayName: '',
    avatar_url: '',
    email: ''
  })
  const [selectedEmoji, setSelectedEmoji] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const emojiPickerRef = useRef(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordValidationErrors, setPasswordValidationErrors] = useState({})

  // Emoji avatars array
  const emojiAvatars = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
    '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦',
    '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞',
    '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿',
    '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
    '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🙈',
    '🙉', '🙊', '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺',
    '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆',
    '🐴', '🐎', '🦄', '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷',
    '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒',
    '🐘', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️',
    '🦔', '🦇', '🐻', '🐨', '🐼', '🦥', '🦦', '🦡', '🐾', '🦃',
    '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🦅', '🦆', '🦢', '🦜',
    '🦩', '🦚', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
    '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢',
    '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡',
    '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
    '🦍', '🐘', '🦏', '🦛', '🐪', '🐫', '🦙', '🦒', '🐃', '🐂',
    '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈',
    '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🦉', '🦅', '🦆', '🐧',
    '🐦', '🐤', '🐣', '🐥', '🦇', '🦉', '🦅', '🦆', '🦢', '🦜',
    '🦩', '🦚', '🦉', '🦅', '🦆', '🦢', '🦜', '🦩', '🦚', '🦉'
  ]

  useEffect(() => {
    if (user) {
      console.log('ProfilePage - User data:', user)
      console.log('ProfilePage - User metadata:', user.user_metadata)
      
      const currentAvatar = user.user_metadata?.avatar_url || user.avatar_url || ''
      const isEmoji = emojiAvatars.includes(currentAvatar)
      
      setProfileData({
        displayName: user.user_metadata?.nickname || user.user_metadata?.username || user.nickname || user.username || '',
        avatar_url: currentAvatar,
        email: user.email || ''
      })
      
      if (isEmoji) {
        setSelectedEmoji(currentAvatar)
        setAvatarPreview(currentAvatar)
      } else {
        setSelectedEmoji('')
        setAvatarPreview(currentAvatar)
      }
    }
  }, [user])

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  const handleInputChange = (field, value) => {
    setProfileData({ ...profileData, [field]: value })
  }

  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji)
    setAvatarPreview(emoji)
    setProfileData({ ...profileData, avatar_url: emoji })
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

  // Handle password input changes
  const handlePasswordInputChange = (field, value) => {
    setPasswordData({ ...passwordData, [field]: value })
    
    const errors = { ...passwordValidationErrors }
    
    if (field === 'newPassword' && value) {
      const passwordErrors = validatePassword(value)
      if (passwordErrors.length > 0) {
        errors.newPassword = passwordErrors
      } else {
        delete errors.newPassword
      }
    }
    
    if (field === 'confirmPassword' && value) {
      if (value !== passwordData.newPassword) {
        errors.confirmPassword = 'Passwords do not match'
      } else {
        delete errors.confirmPassword
      }
    }
    
    setPasswordValidationErrors(errors)
  }


  const handleSave = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Update user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          nickname: profileData.displayName,
          avatar_url: profileData.avatar_url
        }
      })

      if (error) {
        setError(`Failed to update profile: ${error.message}`)
      } else {
        setSuccess('✅ Profile updated successfully!')
        // Update local state
        setAvatarPreview(profileData.avatar_url)
      }
    } catch (err) {
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    // Validate new password
    const passwordErrors = validatePassword(passwordData.newPassword)
    if (passwordErrors.length > 0) {
      setError(`Password requirements not met: ${passwordErrors.join(', ')}`)
      return
    }

    // Validate password confirmation
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data, error } = await AuthService.updatePassword(passwordData.newPassword)
      
      if (error) {
        setError(`Failed to update password: ${error.message}`)
      } else {
        setSuccess('✅ Password updated successfully!')
        setShowPasswordChange(false)
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setPasswordValidationErrors({})
      }
    } catch (err) {
      setError('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onNavigate('login')
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="mb-2 text-4xl font-bold text-white">Profile Settings</h1>
            <p className="text-emerald-100">Manage your account information</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('dashboard')}
            className="rounded-full border border-emerald-300/60 bg-emerald-500/20 px-6 py-3 text-emerald-50 transition-colors hover:bg-emerald-500/30"
          >
            ← Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2.5rem] border border-white/20 bg-gradient-to-br from-slate-100/85 via-white/75 to-emerald-50/70 p-8 text-emerald-900 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-3 text-red-100"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-4 py-3 text-emerald-900"
            >
              {success}
            </motion.div>
          )}

          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="text-center">
              <label className="mb-4 block text-sm font-medium text-emerald-800">
                Choose Your Avatar
              </label>
              <div className="flex flex-col items-center space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-200 bg-white/80 text-4xl text-emerald-900 transition-colors hover:border-emerald-300"
                >
                  {avatarPreview || '👤'}
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm text-emerald-950 opacity-0 transition-opacity group-hover:opacity-100">
                    ✏️
                  </div>
                </motion.button>
                <p className="text-sm text-emerald-600">
                  Click to change your avatar
                </p>
              </div>
            </div>

            {/* Emoji Selection Dropdown */}
            {showEmojiPicker && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-emerald-100/80 bg-white/90 p-4 text-emerald-900 shadow-lg backdrop-blur"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-emerald-700">Select Avatar</h3>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-sm text-emerald-400 transition-colors hover:text-emerald-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-6 gap-2">
                    {emojiAvatars.map((emoji, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          handleEmojiSelect(emoji)
                          setShowEmojiPicker(false)
                        }}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 text-lg transition-all ${
                          selectedEmoji === emoji
                            ? 'border-emerald-400 bg-emerald-100'
                            : 'border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Display Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-800">
                Display Name
              </label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className="w-full rounded-xl border border-emerald-200/60 bg-white/85 px-4 py-3 text-emerald-900 shadow-inner focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                placeholder="Enter your display name"
              />
              <p className="mt-1 text-xs text-emerald-600">
                This is how your name will appear to other users
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-800">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full rounded-xl border border-emerald-200/50 bg-emerald-50/70 px-4 py-3 text-emerald-700"
                placeholder="Email address"
              />
              <p className="mt-1 text-xs text-emerald-600">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Password Change Section */}
            <div className="border-t border-emerald-100/80 pt-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-emerald-900">Password</h3>
                  <p className="text-sm text-emerald-600">Change your account password</p>
                </div>
                {!showPasswordChange && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPasswordChange(true)}
                    className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
                  >
                    Change Password
                  </motion.button>
                )}
              </div>

              {showPasswordChange && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 rounded-2xl border border-emerald-100/80 bg-white/80 p-4 shadow-inner"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-emerald-800">
                      New Password
                      <span className="text-xs text-gray-500 ml-2">
                        (8+ chars, uppercase, lowercase, number, special char)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                      className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                        passwordValidationErrors.newPassword ? 'border-red-300 bg-red-50' : 'border-emerald-200/60 bg-white/85'
                      }`}
                      placeholder="Enter new password"
                    />
                    {passwordValidationErrors.newPassword && (
                      <div className="mt-1">
                        {Array.isArray(passwordValidationErrors.newPassword) ? (
                          <ul className="list-inside list-disc text-sm text-red-500">
                            {passwordValidationErrors.newPassword.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-red-500">{passwordValidationErrors.newPassword}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-emerald-800">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                      className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-4 focus:ring-emerald-200 ${
                        passwordValidationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-emerald-200/60 bg-white/85'
                      }`}
                      placeholder="Confirm new password"
                    />
                    {passwordValidationErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">{passwordValidationErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePasswordChange}
                      disabled={loading || Object.keys(passwordValidationErrors).length > 0}
                      className="flex-1 rounded-full bg-emerald-500 py-3 px-4 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowPasswordChange(false)
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        })
                        setPasswordValidationErrors({})
                        setError('')
                        setSuccess('')
                      }}
                      className="rounded-full bg-emerald-200 py-3 px-4 font-semibold text-emerald-800 transition-colors hover:bg-emerald-300"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={loading}
                className="flex-1 rounded-full bg-emerald-500 py-3 px-6 font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="rounded-full bg-red-500 py-3 px-6 font-semibold text-white transition-colors hover:bg-red-600"
              >
                Sign Out
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
