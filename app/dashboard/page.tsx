"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, ShieldAlert, Copy, Clock, Activity, RefreshCw, Smartphone } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useVaultStore } from "@/store/useStore"
import { decryptVaultItem, calculatePasswordStrength } from "@/lib/encryption"
import Link from "next/link"

export default function DashboardPage() {
  const { user, masterKey } = useVaultStore()
  const [stats, setStats] = useState({
    total: 0,
    weak: 0,
    reused: 0,
    old: 0,
    score: 100,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (!user || !masterKey) return
      
      try {
        const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        
        let total = 0
        let weak = 0
        let old = 0
        const passwords: string[] = []
        
        for (const doc of querySnapshot.docs) {
          total++
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            
            const strength = calculatePasswordStrength(decrypted.password)
            if (strength < 50) weak++
            
            passwords.push(decrypted.password)
            
            // Check if old (e.g., older than 90 days)
            const createdAt = new Date(data.created_at)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - createdAt.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays > 90) old++
            
          } catch (e) {
            console.error("Failed to decrypt item for stats", e)
          }
        }
        
        // Calculate reused
        const uniquePasswords = new Set(passwords)
        const reused = total - uniquePasswords.size
        
        // Calculate score
        let score = 100
        score -= (weak * 5)
        score -= (reused * 3)
        score -= (old * 2)
        score = Math.max(0, score)
        
        setStats({ total, weak, reused, old, score })
      } catch (error: any) {
        console.error("Error fetching stats:", error)
        if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota exceeded')) {
          // Silent fail or toast
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [user, masterKey])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Overview of your vault security</p>
          </div>
          <Link href="/dashboard/mobile">
            <Card className="bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-emerald-500" />
                <div className="text-sm">
                  <p className="font-semibold text-emerald-500">Get Mobile App</p>
                  <p className="text-xs text-emerald-500/70">Access vault on Android</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Passwords</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{loading ? "-" : `${stats.score}/100`}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Weak Passwords</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? "-" : stats.weak}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Reused Passwords</CardTitle>
              <Copy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{loading ? "-" : stats.reused}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
                Chart visualization will appear here
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Vault Synced</p>
                    <p className="text-sm text-muted-foreground">Just now</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
