"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Key, ShieldAlert, Copy, Activity, Smartphone, CreditCard, FileText, MapPin } from "lucide-react"
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
    logins: 0,
    cards: 0,
    notes: 0,
    addresses: 0,
    weak: 0,
    fair: 0,
    strong: 0,
    reused: 0,
    old: 0,
    score: 100,
  })
  const [recentItems, setRecentItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      if (!user || !masterKey) return
      
      try {
        // Fetch Logins
        const loginsQ = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const loginsSnap = await getDocs(loginsQ)
        
        let loginsCount = 0
        let weak = 0
        let fair = 0
        let strong = 0
        let old = 0
        const passwords: string[] = []
        const allItems: any[] = []
        
        for (const doc of loginsSnap.docs) {
          loginsCount++
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

            allItems.push({
              id: doc.id,
              type: 'login',
              title: decrypted.website_name || "Unknown",
              subtitle: decrypted.username || "No username",
              date: data.created_at || new Date().toISOString()
            })
            
          } catch (e) {
            console.error("Failed to decrypt item for stats", e)
          }
        }

        // Fetch Cards
        const cardsQ = query(collection(db, "cards"), where("user_id", "==", user.uid))
        const cardsSnap = await getDocs(cardsQ)
        const cardsCount = cardsSnap.size
        for (const doc of cardsSnap.docs) {
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            allItems.push({
              id: doc.id,
              type: 'card',
              title: decrypted.title || "Unknown Card",
              subtitle: decrypted.cardholder_name || "No name",
              date: data.created_at || new Date().toISOString()
            })
          } catch (e) {}
        }

        // Fetch Notes
        const notesQ = query(collection(db, "notes"), where("user_id", "==", user.uid))
        const notesSnap = await getDocs(notesQ)
        const notesCount = notesSnap.size
        for (const doc of notesSnap.docs) {
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            allItems.push({
              id: doc.id,
              type: 'note',
              title: decrypted.title || "Untitled Note",
              subtitle: "Secure Note",
              date: data.created_at || new Date().toISOString()
            })
          } catch (e) {}
        }

        // Fetch Addresses
        const addressesQ = query(collection(db, "addresses"), where("user_id", "==", user.uid))
        const addressesSnap = await getDocs(addressesQ)
        const addressesCount = addressesSnap.size
        for (const doc of addressesSnap.docs) {
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            allItems.push({
              id: doc.id,
              type: 'address',
              title: decrypted.title || "Untitled Address",
              subtitle: decrypted.full_name || "No name",
              date: data.created_at || new Date().toISOString()
            })
          } catch (e) {}
        }
        
        // Calculate reused
        const uniquePasswords = new Set(passwords)
        const reused = passwords.length - uniquePasswords.size
        
        // Calculate score
        let score = 100
        if (loginsCount > 0) {
          score -= (weak * 10)
          score -= (reused * 5)
          score -= (old * 2)
        }
        score = Math.max(0, score)
        
        setStats({ 
          total: loginsCount + cardsCount + notesCount + addressesCount, 
          logins: loginsCount,
          cards: cardsCount,
          notes: notesCount,
          addresses: addressesCount,
          weak, fair, strong, reused, old, score 
        })

        // Sort and set recent items
        const sortedItems = allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
        setRecentItems(sortedItems)

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
              <CardTitle className="text-sm font-medium">Vault Items</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "-" : stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.logins} logins, {stats.cards} cards
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Score</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">{loading ? "-" : `${stats.score}/100`}</div>
              <p className="text-xs text-muted-foreground">
                Based on password health
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-destructive">Weak Passwords</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{loading ? "-" : stats.weak}</div>
              <p className="text-xs text-muted-foreground">
                Requires immediate update
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-500">Reused Passwords</CardTitle>
              <Copy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{loading ? "-" : stats.reused}</div>
              <p className="text-xs text-muted-foreground">
                Increases credential stuffing risk
              </p>
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
              <CardTitle>Recently Added</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : recentItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No items in vault yet.</div>
                ) : (
                  recentItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        {item.type === 'login' && <Key className="h-4 w-4 text-blue-500" />}
                        {item.type === 'card' && <CreditCard className="h-4 w-4 text-emerald-500" />}
                        {item.type === 'note' && <FileText className="h-4 w-4 text-purple-500" />}
                        {item.type === 'address' && <MapPin className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4 text-xs" asChild>
                <Link href="/dashboard/logins">View all items</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
