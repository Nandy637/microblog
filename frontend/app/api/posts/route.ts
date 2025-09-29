import { NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content } = await req.json()
  if (!content || typeof content !== "string" || content.length > 1000) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 })
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    content,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: Request) {
  const supabase = getServerSupabase()
  const url = new URL(req.url)
  const userId = url.searchParams.get("user_id")

  const { data } = await supabase.rpc("get_posts_with_meta", {
    p_viewer_id: null,
    p_limit: 20,
    p_user_id: userId,
  })

  return NextResponse.json({ items: data ?? [] })
}
