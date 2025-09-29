"use client"

import useSWRInfinite from "swr/infinite"
import PostCard, { type Post } from "./post-card"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function FeedList() {
  const getKey = (pageIndex: number, previousPageData: { items: Post[]; nextCursor: string | null } | null) => {
    if (previousPageData && previousPageData.items.length === 0) return null
    const cursor = previousPageData?.nextCursor
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""
    return `/api/feed${params}`
  }

  const { data, error, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher)

  const items = data?.flatMap((d) => d.items) ?? []
  const nextCursor = data?.[data.length - 1]?.nextCursor ?? null

  return (
    <div className="flex flex-col gap-4">
      {items.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {error && <p className="text-sm text-destructive-foreground">Failed to load</p>}
      {nextCursor && (
        <Button onClick={() => setSize(size + 1)} disabled={isValidating} variant="outline">
          {isValidating ? "Loading..." : "Load more"}
        </Button>
      )}
      {!nextCursor && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">You’re all caught up</p>
      )}
    </div>
  )
}
