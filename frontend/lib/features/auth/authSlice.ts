import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface User {
  id: number
  username: string
  email: string
  bio?: string
  avatar_url?: string
  followers_count: number
  following_count: number
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string; refreshToken?: string; user: User }>) => {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken || null
      state.user = action.payload.user
      state.isAuthenticated = true
      // Also save to localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.accessToken)
        if (action.payload.refreshToken) {
          localStorage.setItem('refreshToken', action.payload.refreshToken)
        }
      }
    },
    logout: (state) => {
      state.accessToken = null
      state.refreshToken = null
      state.user = null
      state.isAuthenticated = false
      // Also clear from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
})

export const { setCredentials, logout, updateUser } = authSlice.actions
export default authSlice.reducer
