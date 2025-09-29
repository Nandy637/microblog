import { getServerSupabase } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import FollowButton from "@/components/follow-button"
import PostCard, { type Post } from "@/components/post-card"

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = getServerSupabase()
  const username = decodeURIComponent(params.username)

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", username)
    .maybeSingle()

  if (!profile) notFound()

  const {
    data: { user: me },
  } = await supabase.auth.getUser()

  let initiallyFollowing = false
  if (me) {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", me.id)
      .eq("followed_id", profile.id)
      .maybeSingle()
    initiallyFollowing = !!data
  }

  const { data: posts } = await supabase.rpc("get_user_posts_with_meta", {
    p_user_id: profile.id,
    p_viewer_id: me?.id ?? null,
    p_limit: 20,
  })

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <section className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div>
          <h1 className="text-xl font-semibold">{profile.display_name || profile.username}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
        {me && me.id !== profile.id && <FollowButton userId={profile.id} initiallyFollowing={initiallyFollowing} />}
      </section>

      <section className="flex flex-col gap-4">
        {(posts as Post[] | null)?.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </section>
    </main>
  )
}
