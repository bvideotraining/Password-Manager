"use client"

import { useVaultStore } from "@/store/useStore"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"

export function Header() {
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
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center">
        {/* Mobile menu trigger can go here */}
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>{user?.email}</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLock}>
          Lock Vault
        </Button>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
