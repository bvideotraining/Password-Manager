"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, Key, CreditCard, MapPin, FileText, Settings, Activity, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Logins", href: "/dashboard/logins", icon: Key },
  { name: "Credit Cards", href: "/dashboard/cards", icon: CreditCard },
  { name: "Addresses", href: "/dashboard/addresses", icon: MapPin },
  { name: "Secure Notes", href: "/dashboard/notes", icon: FileText },
  { name: "Password Generator", href: "/dashboard/generator", icon: Shield },
  { name: "Security Dashboard", href: "/dashboard/security", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Shield className="mr-2 h-6 w-6 text-emerald-500" />
        <span className="font-bold text-lg tracking-tight">SecureVault</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
