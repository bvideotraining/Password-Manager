"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Key, ShieldAlert, Copy, Activity, Smartphone } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useVaultStore } from "@/store/useStore"
import { decryptVaultItem, calculatePasswordStrength } from "@/lib/encryption"
import Link from "next/link"
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, CartesianGrid 
} from 'recharts'

export default function DashboardPage() {
  const { user, masterKey } = useVaultStore()
  const [stats, setStats] = useState({
    total: 0,
    weak: 0,
    fair: 0,
    strong: 0,
    reused: 0,
    old: 0,
    score: 100,
  })
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      if (!user || !masterKey) return
      
      try {
        const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        
        let total = 0
        let weak = 0
        let fair = 0
        let strong = 0
        let old = 0
        const passwords: string[] = []
        
        for (const doc of querySnapshot.docs) {
          total++
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            
            const strength = calculatePasswordStrength(decrypted.password)
            if (strength < 50) weak++
            else if (strength < 80) fair++
            else strong++
            
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
        if (total > 0) {
          score -= (weak * 10)
          score -= (reused * 5)
          score -= (old * 2)
        }
        score = Math.max(0, score)
        
        setStats({ total, weak, fair, strong, reused, old, score })
      } catch (error: any) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [user, masterKey])

  const pieData = [
    { name: 'Security Score', value: stats.score },
    { name: 'Risk', value: 100 - stats.score },
  ]

  const barData = [
    { name: 'Weak', count: stats.weak, fill: '#ef4444' },
    { name: 'Fair', count: stats.fair, fill: '#f59e0b' },
    { name: 'Strong', count: stats.strong, fill: '#10b981' },
  ]

  const COLORS = ['#10b981', '#1e293b']

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
              <CardTitle>Password Strength Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {mounted && !loading ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading charts...
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Overall Security</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] relative">
              {mounted && !loading ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-emerald-500">{stats.score}%</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Secure</span>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading charts...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
