"use client"

import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { useVaultStore } from "@/store/useStore"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { motion } from "motion/react"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isUnlocked, user } = useVaultStore()
  const router = useRouter()

  useEffect(() => {
    if (!user || !isUnlocked) {
      router.push("/")
    }
  }, [user, isUnlocked, router])

  if (!user || !isUnlocked) {
    return null // or a loading spinner
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
