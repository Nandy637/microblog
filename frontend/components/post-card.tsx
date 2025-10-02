"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAppSelector } from "@/lib/hooks"
import { apiRequest, getAuthHeaders } from "@/lib/api"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Heart, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import EditPostDialog from "./edit-post-dialog"

interface Author {
  id: number
  username: string
  avatar_url?: string
}

interface Post {
  id: number
  author: Author
  content: string
  image_url?: string
  created_at: string
  likes_count: number
  is_liked: boolean
}

interface PostCardProps {
  post: Post
  onPostUpdated?: () => void
  onPostDeleted?: () => void
}

export default function PostCard({ post: initialPost, onPostUpdated, onPostDeleted }: PostCardProps) {
  const [post, setPost] = useState(initialPost)
  const [isLiking, setIsLiking] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { user, accessToken } = useAppSelector((state) => state.auth)

  const isOwnPost = user?.id === post.author.id

  const handleLike = async () => {
    if (isLiking) return

    // Optimistic update
    const previousState = { ...post }
    setPost({
      ...post,
      is_liked: !post.is_liked,
      likes_count: post.is_liked ? post.likes_count - 1 : post.likes_count + 1,
    })
    setIsLiking(true)

    try {
      const data = await apiRequest<{ is_liked: boolean; likes_count: number }>(`/posts/${post.id}/toggle_like/`, {
        method: "POST",
        headers: getAuthHeaders(accessToken!),
      })

      // Update with server response
      setPost({
        ...post,
        is_liked: data.is_liked,
        likes_count: data.likes_count,
      })
    } catch (error: any) {
      // Revert on error
      setPost(previousState)
      toast.error(error.message || "Failed to like post")
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return

    setIsDeleting(true)

    try {
      await apiRequest(`/posts/${post.id}/`, {
        method: "DELETE",
        headers: getAuthHeaders(accessToken!),
      })

      toast.success("Post deleted")
      onPostDeleted?.()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete post")
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.username}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatar_url || "/placeholder.svg"} alt={post.author.username} />
                <AvatarFallback>{post.author.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div>
              <Link href={`/profile/${post.author.username}`} className="font-semibold hover:underline">
                {post.author.username}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>

          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} disabled={isDeleting} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pb-3">
          <p className="text-pretty whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <div className="relative w-full rounded-lg overflow-hidden">
              <Image
                src={post.image_url || "/placeholder.svg"}
                alt="Post image"
                width={600}
                height={400}
                className="w-full object-cover"
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={post.is_liked ? "text-red-500" : ""}
          >
            <Heart className={`h-4 w-4 mr-2 ${post.is_liked ? "fill-current" : ""}`} />
            {post.likes_count}
          </Button>
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Comment
          </Button>
        </CardFooter>
      </Card>

      <EditPostDialog
        post={post}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onPostUpdated={() => {
          onPostUpdated?.()
        }}
      />
    </>
  )
}
