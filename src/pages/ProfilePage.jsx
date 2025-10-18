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
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-purple-200">Manage your account information</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('dashboard')}
            className="bg-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/30 transition-colors"
          >
            ← Back to Dashboard
          </motion.button>
        </motion.div>

        {/* Profile Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-8 shadow-2xl"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6"
            >
              {success}
            </motion.div>
          )}

          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Choose Your Avatar
              </label>
              <div className="flex flex-col items-center space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="relative w-24 h-24 rounded-full border-4 border-purple-200 bg-gray-100 flex items-center justify-center text-4xl hover:border-purple-300 transition-colors cursor-pointer group"
                >
                  {avatarPreview || '👤'}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    ✏️
                  </div>
                </motion.button>
                <p className="text-sm text-gray-500">
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
                className="border border-gray-200 rounded-lg p-4 bg-white shadow-lg"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Select Avatar</h3>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm"
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
                        className={`w-8 h-8 flex items-center justify-center text-lg rounded-lg border-2 transition-all ${
                          selectedEmoji === emoji
                            ? 'border-purple-500 bg-purple-100'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={profileData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your display name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is how your name will appear to other users
              </p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="Email address"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            {/* Password Change Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-800">Password</h3>
                  <p className="text-sm text-gray-600">Change your account password</p>
                </div>
                {!showPasswordChange && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPasswordChange(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Change Password
                  </motion.button>
                )}
              </div>

              {showPasswordChange && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 bg-gray-50 p-4 rounded-lg"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                      <span className="text-xs text-gray-500 ml-2">
                        (8+ chars, uppercase, lowercase, number, special char)
                      </span>
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordValidationErrors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter new password"
                    />
                    {passwordValidationErrors.newPassword && (
                      <div className="mt-1">
                        {Array.isArray(passwordValidationErrors.newPassword) ? (
                          <ul className="text-red-500 text-sm list-disc list-inside">
                            {passwordValidationErrors.newPassword.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-red-500 text-sm">{passwordValidationErrors.newPassword}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        passwordValidationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Confirm new password"
                    />
                    {passwordValidationErrors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1">{passwordValidationErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePasswordChange}
                      disabled={loading || Object.keys(passwordValidationErrors).length > 0}
                      className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="bg-gray-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-600 transition-colors"
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
                className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
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
