import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type FeedState = {
  cursor: string | null
  optimisticLikes: Record<string, boolean> // post_id -> liked?
}

const initialState: FeedState = {
  cursor: null,
  optimisticLikes: {},
}

const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    setCursor(state, action: PayloadAction<string | null>) {
      state.cursor = action.payload
    },
    setOptimisticLike(state, action: PayloadAction<{ postId: string; liked: boolean }>) {
      state.optimisticLikes[action.payload.postId] = action.payload.liked
    },
  },
})

export const { setCursor, setOptimisticLike } = feedSlice.actions
export default feedSlice.reducer
