"use client"

import { useState, useEffect } from "react"
import { useAppSelector } from "@/lib/hooks"
import { useProtectedApi } from "@/hooks/use-protected-api"
import PostComposer from "@/components/post-composer"
import PostCard from "@/components/post-card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Post {
  id: number
  author: {
    id: number
    username: string
    avatar_url?: string
  }
  content: string
  image_url?: string
  created_at: string
  likes_count: number
  is_liked: boolean
}

interface FeedResponse {
  results: Post[]
  next: string | null
  previous: string | null
}

export default function FeedPage() {
  const router = useRouter()
  const { protectedFetch } = useProtectedApi()

  const { accessToken, user } = useAppSelector((state) => state.auth)

  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Wait for both accessToken and protectedFetch to be available
    if (!accessToken || !protectedFetch) {
      return
    }

    async function loadFeed(cursor?: string) {
      setIsLoading(true)
      setError(null)
      try {
        const endpoint = cursor || "/feed/"
        const data = await protectedFetch<FeedResponse>(endpoint)

        if (data) {
          if (cursor) {
            setPosts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id))
              const newPosts = data.results.filter((p) => !existingIds.has(p.id))
              return [...prev, ...newPosts]
            })
          } else {
            setPosts(data.results)
          }
          setNextCursor(data.next)
        } else {
          // No data returned, likely unauthenticated
          router.push('/login')
        }
      } catch (e: any) {
        if (e && typeof e === 'object' && 'status' in e && (e.status === 401 || e.status === 403)) {
          router.push('/login')
        } else {
          setError("Failed to load feed data.")
          console.error(e)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadFeed()
  }, [accessToken, protectedFetch, router])

  // WebSocket connection
  useEffect(() => {
    if (!user || !accessToken) return

    const ws = new WebSocket(`ws://127.0.0.1:8001/ws/feed/`)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const newPost = JSON.parse(event.data)
      setPosts((prev) => [newPost, ...prev])
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [user, accessToken])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const data = await protectedFetch<FeedResponse>(nextCursor)
      if (data) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const newPosts = data.results.filter((p) => !existingIds.has(p.id))
          return [...prev, ...newPosts]
        })
        setNextCursor(data.next)
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load more")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePostCreated = (newPost: Post) => {
    // Prepend the new post to the feed
    setPosts((prev) => [newPost, ...prev])
  }

  const handlePostUpdated = () => {
    // Refresh feed
    if (accessToken) {
      protectedFetch<FeedResponse>("/feed/").then((data) => {
        if (data) setPosts(data.results)
      }).catch(console.error)
    }
  }

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (isLoading || accessToken === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!accessToken) {
    return <div className="p-8 text-center">Please log in to view the feed.</div>
  }

  if (error) {
    return <div className="p-8 text-red-500">Error loading feed: {error}</div>
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Feed</h1>
        </div>

        <PostComposer onPostCreated={handlePostCreated} />

        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={() => handlePostDeleted(post.id)}
                />
              ))}

              {nextCursor && (
                <div className="flex justify-center pt-4">
                  <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="outline">
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
