import { NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [], nextCursor: null }, { status: 200 })

  const url = new URL(req.url)
  const cursor = url.searchParams.get("cursor")

  const { data, error } = await supabase.rpc("get_feed_with_meta", {
    p_viewer_id: user.id,
    p_limit: 10,
    p_cursor: cursor,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const items = data?.items ?? []
  const nextCursor = data?.next_cursor ?? null
  return NextResponse.json({ items, nextCursor })
}
