"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAppSelector } from "@/lib/hooks"
import { apiRequest, getAuthHeaders } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface PostComposerProps {
  onPostCreated?: (post: any) => void
}

export default function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, accessToken } = useAppSelector((state) => state.auth)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB")
        return
      }
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)

    const { public_url } = await apiRequest<{ public_url: string }>(
      "/uploads/",
      {
        method: "POST",
        headers: getAuthHeaders(accessToken!),
        body: formData,
      }
    )

    return public_url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && !imageFile) {
      toast.error("Post cannot be empty")
      return
    }

    setIsUploading(true)

    try {
      let imageUrl: string | undefined

      // Upload image if present
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile)
        } catch (uploadError: any) {
          // If image upload fails, warn but continue with text-only post
          console.warn("Image upload failed:", uploadError)
          toast.warning("Image upload failed. Creating text-only post.")
          imageUrl = undefined
        }
      }

      // Check again after upload attempt
      const finalContent = content.trim()
      if (!finalContent && !imageUrl) {
        toast.error("Post cannot be empty")
        return
      }

      // Create post
      const newPost = await apiRequest("/posts/", {
        method: "POST",
        headers: getAuthHeaders(accessToken!),
        body: JSON.stringify({
          content: finalContent,
          image_url: imageUrl,
        }),
      })

      toast.success("Post created!")
      setContent("")
      removeImage()
      onPostCreated?.(newPost)
    } catch (error: any) {
      toast.error(error.message || "Failed to create post")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url || "/placeholder.svg"} alt={user?.username} />
            <AvatarFallback>{user?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none border-0 p-0 focus-visible:ring-0"
              disabled={isUploading}
            />

            {imagePreview && (
              <div className="relative inline-block">
                <Image
                  src={imagePreview || "/placeholder.svg"}
                  alt="Upload preview"
                  width={300}
                  height={300}
                  className="rounded-lg object-cover max-h-[300px]"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={removeImage}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </div>
              <Button type="submit" disabled={isUploading || (!content.trim() && !imageFile)}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Card>
  )
}
