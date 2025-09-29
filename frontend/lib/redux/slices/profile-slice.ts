import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type ProfileState = {
  following: Record<string, boolean> // user_id -> following?
}

const initialState: ProfileState = {
  following: {},
}

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setFollowing(state, action: PayloadAction<{ userId: string; following: boolean }>) {
      state.following[action.payload.userId] = action.payload.following
    },
  },
})

export const { setFollowing } = profileSlice.actions
export default profileSlice.reducer
