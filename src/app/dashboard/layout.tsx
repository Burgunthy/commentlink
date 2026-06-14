"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Settings,
  Package,
  Users,
  Link2,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/accounts", label: "Accounts", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-bg
          transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <Link2 className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold text-white">DMify</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1 text-sidebar-text hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-sidebar-active-bg text-primary"
                      : "text-sidebar-text hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/10 px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-text transition-colors duration-150 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {navItems.find((item) => isActive(item.href))?.label ?? "Dashboard"}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-zinc-50 p-6 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}
