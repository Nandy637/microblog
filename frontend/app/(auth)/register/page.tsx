import AuthForm from "@/components/auth-form"

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <AuthForm mode="register" />
    </main>
  )
}
