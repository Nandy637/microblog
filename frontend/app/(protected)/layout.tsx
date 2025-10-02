import type React from "react"
import AuthGuard from "@/components/auth-guard"
import Navbar from "@/components/navbar"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Navbar />
        {children}
      </div>
    </AuthGuard>
  )
}
