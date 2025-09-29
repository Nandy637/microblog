import { configureStore } from "@reduxjs/toolkit"
import authReducer from "./slices/auth-slice"
import feedReducer from "./slices/feed-slice"
import profileReducer from "./slices/profile-slice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    feed: feedReducer,
    profile: profileReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
