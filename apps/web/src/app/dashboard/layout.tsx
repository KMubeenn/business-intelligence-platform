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
  Package2,
  TableProperties,
  FileText,
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

  const navItems = [
    { href: '/dashboard',              label: 'Command Center',  icon: Home,            exact: true },
    { href: '/dashboard/data-sources', label: 'Data Sources',    icon: Package,         exact: false },
    { href: '/dashboard/data-explorer',label: 'Data Explorer',   icon: TableProperties, exact: false },
    { href: '/dashboard/reports',      label: 'AI Reports',      icon: FileText,        exact: false },
    { href: '#',                        label: 'Team',            icon: Users,           exact: false },
  ];

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] bg-background text-foreground">
      {/* SIDEBAR */}
      <div className="hidden border-r border-border bg-card/80 backdrop-blur-xl md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Package2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-foreground">SaaS Foundation</span>
            </Link>
          </div>
          <div className="flex-1 py-4">
            <nav className="grid items-start px-3 text-sm font-medium gap-0.5">
              {navItems.map(item => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== '#';
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="p-4 border-t border-border/50">
            <div className="text-xs text-muted-foreground text-center">Business Intelligence Platform</div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex flex-col">
        {/* TOP HEADER */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full appearance-none bg-background border-border pl-9 shadow-none md:w-2/3 lg:w-1/3 rounded-md"
                />
              </div>
            </form>
          </div>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Toggle notifications</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" className="rounded-full bg-secondary hover:bg-secondary/80">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="font-semibold text-foreground">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem className="cursor-pointer hover:bg-accent text-foreground">Settings</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer hover:bg-accent text-foreground">Support</DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex flex-1 flex-col gap-4 p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
