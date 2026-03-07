"use client"

import { useVaultStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { LogOut, User, Menu } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, lockVault, setUser } = useVaultStore()
  const router = useRouter()

  const handleLogout = async () => {
    await auth.signOut()
    lockVault()
    setUser(null)
    router.push("/")
  }

  const handleLock = () => {
    lockVault()
    router.push("/")
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{user?.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLock}>
          Lock
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
