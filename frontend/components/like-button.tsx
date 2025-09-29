"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"

async function likePost(id: string) {
  const res = await fetch(`/api/posts/${id}/like`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to like")
}
async function unlikePost(id: string) {
  const res = await fetch(`/api/posts/${id}/like`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to unlike")
}

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string
  initialLiked: boolean
  initialCount: number
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      const next = !liked
      setLiked(next)
      setCount((c) => c + (next ? 1 : -1))
      try {
        if (next) await likePost(postId)
        else await unlikePost(postId)
      } catch {
        // revert if failed
        setLiked(!next)
        setCount((c) => c + (next ? -1 : 1))
      }
    })
  }

  return (
    <Button variant={liked ? "default" : "outline"} size="sm" onClick={toggle} disabled={isPending}>
      {liked ? "Unlike" : "Like"} • {count}
    </Button>
  )
}
