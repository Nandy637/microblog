import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type UserInfo = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
} | null

type AuthState = {
  user: UserInfo
  status: "idle" | "loading" | "authenticated" | "unauthenticated"
}

const initialState: AuthState = {
  user: null,
  status: "idle",
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<UserInfo>) {
      state.user = action.payload
      state.status = action.payload ? "authenticated" : "unauthenticated"
    },
    setAuthStatus(state, action: PayloadAction<AuthState["status"]>) {
      state.status = action.payload
    },
  },
})

export const { setUser, setAuthStatus } = authSlice.actions
export default authSlice.reducer
