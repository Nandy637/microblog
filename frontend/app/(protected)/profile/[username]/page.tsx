"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { useAppSelector } from "@/lib/hooks"
import { apiRequest, getAuthHeaders } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import PostCard from "@/components/post-card"
import FollowButton from "@/components/follow-button"
import { Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface UserProfile {
  id: number
  username: string
  email: string
  bio?: string
  avatar_url?: string
  followers_count: number
  following_count: number
  is_following: boolean
  created_at: string
  posts: {
    results: Post[]
    next: string | null
  }
}

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

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const { user, accessToken } = useAppSelector((state) => state.auth)

  const isOwnProfile = user?.username === username

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiRequest<UserProfile>(`/users/${username}/`, {
        headers: getAuthHeaders(accessToken!),
      })

      setProfile(data)
      setPosts(data.posts.results)
      setNextCursor(data.posts.next)
    } catch (error: any) {
      toast.error(error.message || "Failed to load profile")
    }
  }, [username, accessToken])

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      await fetchProfile()
      setIsLoading(false)
    }

    loadProfile()
  }, [fetchProfile])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)

    try {
      const data = await apiRequest<{ results: Post[]; next: string | null }>(nextCursor, {
        headers: getAuthHeaders(accessToken!),
      })

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const newPosts = data.results.filter((p) => !existingIds.has(p.id))
        return [...prev, ...newPosts]
      })
      setNextCursor(data.next)
    } catch (error: any) {
      toast.error(error.message || "Failed to load more posts")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleFollowChange = (isFollowing: boolean) => {
    if (profile) {
      setProfile({
        ...profile,
        is_following: isFollowing,
        followers_count: isFollowing ? profile.followers_count + 1 : profile.followers_count - 1,
      })
    }
  }

  const handlePostUpdated = () => {
    fetchProfile()
  }

  const handlePostDeleted = (postId: number) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">User not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.username} />
                <AvatarFallback className="text-2xl">{profile.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">{profile.username}</h1>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>

                  {!isOwnProfile && (
                    <FollowButton
                      userId={profile.id}
                      initialIsFollowing={profile.is_following}
                      onFollowChange={handleFollowChange}
                    />
                  )}
                </div>

                {profile.bio && <p className="text-pretty">{profile.bio}</p>}

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="font-semibold">{profile.followers_count}</span>{" "}
                    <span className="text-muted-foreground">Followers</span>
                  </div>
                  <div>
                    <span className="font-semibold">{profile.following_count}</span>{" "}
                    <span className="text-muted-foreground">Following</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(profile.created_at), "MMMM yyyy")}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="posts" className="flex-1">
              Posts
            </TabsTrigger>
            <TabsTrigger value="media" className="flex-1">
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4 mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No posts yet</p>
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
          </TabsContent>

          <TabsContent value="media" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {posts
                .filter((post) => post.image_url)
                .map((post) => (
                  <div key={post.id} className="aspect-square relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={post.image_url || "/placeholder.svg"}
                      alt="Post media"
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              {posts.filter((post) => post.image_url).length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No media posts yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
