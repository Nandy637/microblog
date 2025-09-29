"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import useSWRMutation from "swr/mutation"

async function createPost(url: string, { arg }: { arg: { content: string } }) {
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(arg),
    headers: { "Content-Type": "application/json" },
  })
  if (!res.ok) throw new Error("Failed to create post")
  return res.json()
}

export default function PostComposer({ onPosted }: { onPosted?: () => void }) {
  const [content, setContent] = useState("")
  const { trigger, isMutating } = useSWRMutation("/api/posts", createPost)

  const submit = async () => {
    if (!content.trim()) return
    await trigger({ content })
    setContent("")
    onPosted?.()
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's happening?"
        className="min-h-24 bg-background"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Images coming soon</span>
        <Button onClick={submit} disabled={isMutating || !content.trim()}>
          {isMutating ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  )
}
