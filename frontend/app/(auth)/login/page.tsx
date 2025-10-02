"use client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

// Centralized request function to handle tokens and errors
export async function apiRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE', 
    endpoint: string, 
    data: any = null
): Promise<T> {
    const token = localStorage.getItem('accessToken');
    let finalEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${API_BASE_URL}${finalEndpoint}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: 'Server Error' }));
        const message = errorBody.detail || `HTTP error! status: ${response.status}`;
        throw new Error(message);
    }
    return response.json();
}

// Convenience functions for the rest of your app
export function getJson<T>(endpoint: string): Promise<T> {
    return apiRequest('GET', endpoint);
}

export function postJson<T>(endpoint: string, data: any): Promise<T> {
    return apiRequest('POST', endpoint, data);
}
import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAppDispatch } from "@/lib/hooks"
import { setCredentials } from "@/lib/features/auth/authSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useAppDispatch()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = await apiRequest<{ access: string; refresh?: string; user: any }>('POST', '/token/', { email: email, password })

      // Save tokens to localStorage (handled by Redux slice) and also save refresh token if provided
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh)
      }
      dispatch(setCredentials({ accessToken: data.access, user: data.user }))
      toast.success("Welcome back!")
      router.push("/feed")
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {"Don't have an account? "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
