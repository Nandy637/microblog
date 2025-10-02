"use client"

import { useState } from "react"
import { useAppSelector } from "@/lib/hooks"
import { apiRequest, getAuthHeaders } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FollowButtonProps {
  userId: number
  initialIsFollowing: boolean
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({ userId, initialIsFollowing, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)
  const { accessToken } = useAppSelector((state) => state.auth)

  const handleFollow = async () => {
    if (isLoading) return

    // Optimistic update
    const previousState = isFollowing
    setIsFollowing(!isFollowing)
    setIsLoading(true)

    try {
      const data = await apiRequest<{ is_following: boolean }>(`/users/${userId}/follow/`, {
        method: "POST",
        headers: getAuthHeaders(accessToken!),
      })

      setIsFollowing(data.is_following)
      onFollowChange?.(data.is_following)
      toast.success(data.is_following ? "Followed successfully" : "Unfollowed successfully")
    } catch (error: any) {
      // Revert on error
      setIsFollowing(previousState)
      toast.error(error.message || "Failed to update follow status")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleFollow} disabled={isLoading} variant={isFollowing ? "outline" : "default"}>
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading...
        </>
      ) : isFollowing ? (
        "Following"
      ) : (
        "Follow"
      )}
    </Button>
  )
}
