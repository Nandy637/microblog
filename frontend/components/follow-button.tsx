"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"

async function follow(userId: string) {
  const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to follow")
}
async function unfollow(userId: string) {
  const res = await fetch(`/api/users/${userId}/follow`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to unfollow")
}

export default function FollowButton({
  userId,
  initiallyFollowing,
}: {
  userId: string
  initiallyFollowing: boolean
}) {
  const [following, setFollowing] = useState(initiallyFollowing)
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    startTransition(async () => {
      const next = !following
      setFollowing(next)
      try {
        if (next) await follow(userId)
        else await unfollow(userId)
      } catch {
        setFollowing(!next)
      }
    })
  }

  return (
    <Button onClick={toggle} variant={following ? "secondary" : "default"} disabled={isPending}>
      {following ? "Unfollow" : "Follow"}
    </Button>
  )
}
