import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

let _serverClient: ReturnType<typeof createServerClient> | null = null

export function getServerSupabase() {
  if (_serverClient) return _serverClient

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // noop on RSC
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch {
            // noop on RSC
          }
        },
      },
    },
  )

  _serverClient = supabase
  return supabase
}
