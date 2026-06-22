"use client";

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package2 } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await res.json()
      localStorage.setItem("access_token", data.access_token)
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-white">
      {/* LEFT SIDE - BRANDING */}
      <div className="hidden bg-zinc-950 lg:flex flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Package2 className="h-6 w-6" />
          SaaS Foundation
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            The modern standard for business intelligence.
          </h1>
          <p className="text-zinc-400 max-w-md text-lg">
            Connect your databases, build custom data models, and visualize your entire company's operations in one place.
          </p>
        </div>
        <div className="text-sm text-zinc-500">
          © {new Date().getFullYear()} SaaS Foundation Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Welcome back</h1>
            <p className="text-balance text-zinc-500">
              Enter your email to sign in to your account
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-zinc-950 font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-zinc-200 focus-visible:ring-zinc-950 rounded-md"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password" className="text-zinc-950 font-medium">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white border-zinc-200 focus-visible:ring-zinc-950 rounded-md"
              />
            </div>
            <Button type="submit" className="w-full bg-zinc-950 text-white hover:bg-zinc-800 rounded-md py-6 mt-2">
              Sign in
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-zinc-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline font-medium text-zinc-950">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
