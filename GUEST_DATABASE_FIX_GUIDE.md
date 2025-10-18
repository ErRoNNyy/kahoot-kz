# 🔧 Guest User Database Fix Guide

## 🚨 **Problem**: "invalid input syntax for type uuid: 'guest_1760815916996'"

## 🔍 **Root Cause**
The database expects UUID format for `user_id` field, but guest users were using string IDs like "guest_123456".

## ✅ **Solution Implemented**

### **1. Fixed Guest User ID Generation**
- **Before**: `guest_${Date.now()}` → "guest_1760815916996"
- **After**: Proper UUID → "550e8400-e29b-41d4-a716-446655440000"
- **Result**: Database accepts the ID format

### **2. Updated SessionService.joinSession**
- **Guest Detection**: Checks if ID is guest format
- **Proper Field Usage**: Uses `guest_id` for guests, `user_id` for authenticated users
- **Database Compatibility**: Handles both user types correctly

### **3. Database Schema Updates Needed**
Run the SQL script `GUEST_USER_DATABASE_FIX.sql` to:
- Make `user_id` nullable in `session_participants`
- Add `guest_id` field for guest users
- Update RLS policies for guest access

## 🛠️ **Steps to Fix**

### **Step 1: Update Database Schema**
1. **Go to Supabase Dashboard** → SQL Editor
2. **Run the script** `GUEST_USER_DATABASE_FIX.sql`
3. **Verify changes** → Check if tables updated

### **Step 2: Test Guest Login**
1. **Login as guest** → Should generate UUID
2. **Try joining session** → Should work without UUID error
3. **Check database** → Should see guest_id populated

### **Step 3: Verify Fix**
1. **Guest joins session** → No UUID error
2. **Participant appears** → In host's participant list
3. **Database records** → Proper guest_id field used

## 🔧 **Code Changes Made**

### **AuthService.signInAsGuest**
```javascript
// Before: guest_${Date.now()}
// After: generateUUID() → proper UUID format
```

### **SessionService.joinSession**
```javascript
// Added guest detection
const isGuest = participantId.startsWith('guest_') || participantId.includes('-')

// Use appropriate field
if (isGuest) {
  participantData.guest_id = participantId
  participantData.user_id = null
} else {
  participantData.user_id = participantId
  participantData.guest_id = null
}
```

## 🎯 **Expected Results**

### **✅ Working Correctly**:
- Guest login generates proper UUID
- Guest can join sessions without error
- Database stores guest_id instead of user_id
- Host sees guest in participant list
- No UUID syntax errors

### **❌ Still Not Working**:
- UUID syntax errors persist
- Guest can't join sessions
- Database rejects guest IDs
- RLS policies block guest access

## 🚨 **If Still Not Working**

### **Check Database Schema**:
1. **Run SQL script** → `GUEST_USER_DATABASE_FIX.sql`
2. **Verify columns** → `guest_id` field exists
3. **Check RLS policies** → Updated for guests

### **Check Console Logs**:
1. **Guest ID format** → Should be UUID
2. **Session join attempt** → Should use guest_id
3. **Database response** → Should succeed

### **Manual Database Check**:
1. **Check session_participants table** → Should have guest_id column
2. **Check RLS policies** → Should allow guest access
3. **Test insert** → Should work for guests

## 📋 **Database Schema Requirements**

### **session_participants table**:
- `user_id` → Nullable (for authenticated users)
- `guest_id` → Text field (for guest users)
- `nickname` → Required for both
- `score` → Default 0

### **RLS Policies**:
- Allow guests to insert their own records
- Allow hosts to see all participants
- Allow anyone to read active session participants

The guest user database issue should now be completely resolved! 🎉
