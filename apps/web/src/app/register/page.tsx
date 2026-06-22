"use client";

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Package2 } from "lucide-react"

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organizationName: "",
  })
  const [error, setError] = useState("")
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Registration failed. Email might already exist.")
      }

      const data = await res.json()
      localStorage.setItem("access_token", data.access_token)
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-background">
      {/* LEFT SIDE - BRANDING */}
      <div className="hidden bg-card border-r border-border lg:flex flex-col justify-between p-10 text-foreground">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Package2 className="h-6 w-6 text-primary" />
          SaaS Foundation
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Scale your insights, not your infrastructure.
          </h1>
          <p className="text-muted-foreground max-w-md text-lg">
            Create an organization, invite your team, and start making data-driven decisions in minutes.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SaaS Foundation Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[400px] gap-6">
          <div className="grid gap-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your information to set up your organization
            </p>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {error && <div className="text-sm text-destructive font-medium">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-foreground font-medium">First name</Label>
                <Input 
                  id="firstName" 
                  placeholder="Max" 
                  required 
                  onChange={handleChange}
                  className="bg-background border-input focus-visible:ring-ring rounded-md" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-foreground font-medium">Last name</Label>
                <Input 
                  id="lastName" 
                  placeholder="Robinson" 
                  required 
                  onChange={handleChange}
                  className="bg-background border-input focus-visible:ring-ring rounded-md" 
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="organizationName" className="text-foreground font-medium">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Acme Corp"
                required
                onChange={handleChange}
                className="bg-background border-input focus-visible:ring-ring rounded-md"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                onChange={handleChange}
                className="bg-background border-input focus-visible:ring-ring rounded-md"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-foreground font-medium">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                onChange={handleChange}
                className="bg-background border-input focus-visible:ring-ring rounded-md" 
              />
            </div>
            
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md py-6 mt-2">
              Create an account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline font-medium text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
