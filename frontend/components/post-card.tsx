"use client"

import LikeButton from "./like-button"

export type Post = {
  id: string
  author_id: string
  author_username: string | null
  author_display_name: string | null
  content: string
  created_at: string
  likes_count: number
  liked_by_me: boolean
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{post.author_display_name || post.author_username || "User"}</span>
          <span className="text-muted-foreground">@{post.author_username}</span>
        </div>
        <time className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</time>
      </header>
      <p className="text-pretty">{post.content}</p>
      <footer className="mt-2">
        <LikeButton postId={post.id} initialLiked={post.liked_by_me} initialCount={post.likes_count} />
      </footer>
    </article>
  )
}
