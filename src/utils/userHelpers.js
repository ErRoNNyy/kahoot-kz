// Helper functions for user data management

/**
 * Get the display name for a user
 * @param {Object} user - The user object
 * @returns {string} - The display name to show
 */
export const getUserDisplayName = (user) => {
  if (!user) return 'User'
  
  // Check if it's a guest user
  if (user.isGuest) {
    return user.nickname || 'Guest'
  }
  
  // For authenticated users, check in order of preference:
  // 1. user_metadata.nickname (from profile page - this is the main display name)
  // 2. user_metadata.username (from signup - fallback)
  // 3. email prefix (final fallback)
  return (
    user.user_metadata?.nickname ||
    user.user_metadata?.username ||
    (user.email ? user.email.split('@')[0] : 'User')
  )
}

/**
 * Get the user's avatar (emoji or URL)
 * @param {Object} user - The user object
 * @returns {string} - The avatar emoji or URL
 */
export const getUserAvatar = (user) => {
  if (!user) return '👤'
  
  return (
    user.user_metadata?.avatar_url ||
    user.avatar_url ||
    '👤'
  )
}

/**
 * Get the user's email
 * @param {Object} user - The user object
 * @returns {string} - The user's email
 */
export const getUserEmail = (user) => {
  if (!user) return ''
  
  return user.email || ''
}

/**
 * Check if user is a guest
 * @param {Object} user - The user object
 * @returns {boolean} - True if user is a guest
 */
export const isGuestUser = (user) => {
  return user && user.isGuest === true
}

/**
 * Get user profile data for display
 * @param {Object} user - The user object
 * @returns {Object} - Profile data object
 */
export const getUserProfileData = (user) => {
  if (!user) {
    return {
      displayName: 'User',
      avatar: null,
      email: '',
      isGuest: false
    }
  }
  
  return {
    displayName: getUserDisplayName(user),
    avatar: getUserAvatar(user),
    email: getUserEmail(user),
    isGuest: isGuestUser(user)
  }
}
