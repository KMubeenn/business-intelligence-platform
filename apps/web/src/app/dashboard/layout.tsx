"use client";

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Bell,
  CircleUser,
  Home,
  Package,
  Search,
  Users,
  LogOut,
  Package2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    router.push("/login")
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] bg-white text-zinc-950">
      {/* SIDEBAR */}
      <div className="hidden border-r border-zinc-200 bg-white md:block">
        <div className="flex h-full max-h-screen flex-col gap-4">
          <div className="flex h-16 items-center border-b border-zinc-200 px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <Package2 className="h-6 w-6" />
              <span>SaaS Foundation</span>
            </Link>
          </div>
          <div className="flex-1 py-4">
            <nav className="grid items-start px-4 text-sm font-medium gap-1">
              <Link
                href="/dashboard"
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-all ${pathname === '/dashboard'
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'
                  }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/data-sources"
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-all ${pathname.startsWith('/dashboard/data-sources')
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50'
                  }`}
              >
                <Package className="h-4 w-4" />
                Data Sources
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-zinc-500 transition-all hover:text-zinc-950 hover:bg-zinc-50"
              >
                <Users className="h-4 w-4" />
                Team
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col">
        {/* TOP HEADER */}
        <header className="flex h-16 items-center gap-4 border-b border-zinc-200 bg-white px-6">
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-white border-zinc-200 pl-9 focus-visible:ring-zinc-950 shadow-none md:w-2/3 lg:w-1/3 rounded-md"
                />
              </div>
            </form>
          </div>

          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-950">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Toggle notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="rounded-full bg-zinc-100 hover:bg-zinc-200">
                <CircleUser className="h-5 w-5 text-zinc-950" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-zinc-200">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-semibold text-zinc-950">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-200" />
                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-100 text-zinc-700">Settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-zinc-100 text-zinc-700">Support</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-zinc-200" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex flex-1 flex-col gap-4 p-6 bg-zinc-50/50">
          {children}
        </main>
      </div>
    </div>
  )
}
