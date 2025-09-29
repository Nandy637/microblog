import PostComposer from "@/components/post-composer"
import FeedList from "@/components/feed-list"
import { getServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function FeedPage() {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <PostComposer />
      <FeedList />
    </main>
  )
}
