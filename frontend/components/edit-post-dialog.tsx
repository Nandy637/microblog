"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAppSelector } from "@/lib/hooks"
import { apiRequest, getAuthHeaders } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Post {
  id: number
  content: string
  image_url?: string
}

interface EditPostDialogProps {
  post: Post | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPostUpdated?: () => void
}

export default function EditPostDialog({ post, open, onOpenChange, onPostUpdated }: EditPostDialogProps) {
  const [content, setContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const { accessToken } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (post) {
      setContent(post.content)
    }
  }, [post])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast.error("Post cannot be empty")
      return
    }

    setIsUpdating(true)

    try {
      await apiRequest(`/posts/${post?.id}/`, {
        method: "PATCH",
        headers: getAuthHeaders(accessToken!),
        body: JSON.stringify({
          content: content.trim(),
        }),
      })

      toast.success("Post updated!")
      onOpenChange(false)
      onPostUpdated?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to update post")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>Make changes to your post here.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px]"
              disabled={isUpdating}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
