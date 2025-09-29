"use client"

import type React from "react"

import { useState } from "react"
import { getBrowserSupabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

type Props = {
  mode: "login" | "register"
}

export default function AuthForm({ mode }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = getBrowserSupabase()

    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/feed`,
          },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      router.replace("/feed")
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h1 className="text-xl font-semibold text-balance">
        {mode === "register" ? "Create your account" : "Welcome back"}
      </h1>
      <label className="text-sm">Email</label>
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
      <label className="text-sm">Password</label>
      <Input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="bg-background"
      />
      {error && <p className="text-sm text-destructive-foreground">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "register" ? "Sign up" : "Sign in"}
      </Button>
    </form>
  )
}
