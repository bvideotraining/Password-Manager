"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ShieldAlert, ShieldCheck, AlertTriangle, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useVaultStore } from "@/store/useStore"
import { decryptVaultItem, calculatePasswordStrength } from "@/lib/encryption"

export default function SecurityAnalyzerPage() {
  const { user, masterKey } = useVaultStore()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState({
    score: 100,
    weakCount: 0,
    reusedCount: 0,
    oldCount: 0,
    total: 0,
    issues: [] as any[]
  })

  useEffect(() => {
    async function analyzeVault() {
      if (!user || !masterKey) return
      
      try {
        const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        
        let total = 0
        let weakCount = 0
        let oldCount = 0
        const passwordsMap = new Map<string, string[]>() // password -> array of website names
        const issues: any[] = []
        
        for (const doc of querySnapshot.docs) {
          total++
          const data = doc.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            const pwd = decrypted.password
            const site = decrypted.website_name
            
            // Check Strength
            const strength = calculatePasswordStrength(pwd)
            if (strength < 50) {
              weakCount++
              issues.push({
                type: 'weak',
                site: site,
                message: 'Weak password detected. Consider updating to a stronger one.'
              })
            }
            
            // Track for reuse
            if (!passwordsMap.has(pwd)) {
              passwordsMap.set(pwd, [])
            }
            passwordsMap.get(pwd)?.push(site)
            
            // Check Age
            const createdAt = new Date(data.created_at)
            const now = new Date()
            const diffDays = Math.ceil(Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
            if (diffDays > 90) {
              oldCount++
              issues.push({
                type: 'old',
                site: site,
                message: `Password is ${diffDays} days old. Regular rotation is recommended.`
              })
            }
            
          } catch (e) {
            console.error("Failed to decrypt item for analysis", e)
          }
        }
        
        // Calculate reused
        let reusedCount = 0
        passwordsMap.forEach((sites, pwd) => {
          if (sites.length > 1) {
            reusedCount += (sites.length - 1)
            issues.push({
              type: 'reused',
              site: sites.join(", "),
              message: `Password reused across ${sites.length} sites. Use unique passwords.`
            })
          }
        })
        
        // Calculate score
        let score = 100
        score -= (weakCount * 5)
        score -= (reusedCount * 3)
        score -= (oldCount * 2)
        score = Math.max(0, score)
        
        setAnalysis({ score, weakCount, reusedCount, oldCount, total, issues })
      } catch (error) {
        console.error("Error analyzing vault:", error)
      } finally {
        setLoading(false)
      }
    }
    
    analyzeVault()
  }, [user, masterKey])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Analyzer</h2>
          <p className="text-muted-foreground">Comprehensive analysis of your vault health.</p>
        </div>

        <Card className="bg-gradient-to-br from-card to-card/50 border-emerald-500/20">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-8 border-muted">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="84"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-emerald-500"
                    strokeDasharray="527.7"
                    strokeDashoffset={527.7 - (527.7 * analysis.score) / 100}
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div className="text-center">
                  <span className="text-5xl font-bold">{loading ? "-" : analysis.score}</span>
                  <span className="block text-sm text-muted-foreground mt-1">Score</span>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-semibold">
                  {analysis.score >= 80 ? "Your vault is in great shape!" : 
                   analysis.score >= 50 ? "Your vault needs some attention." : 
                   "Critical security issues detected."}
                </h3>
                <p className="text-muted-foreground">
                  We analyzed {analysis.total} passwords in your vault. Addressing the issues below will improve your security score.
                </p>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-destructive">{analysis.weakCount}</span>
                    <span className="block text-sm text-muted-foreground">Weak</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-amber-500">{analysis.reusedCount}</span>
                    <span className="block text-sm text-muted-foreground">Reused</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-2xl font-bold text-blue-500">{analysis.oldCount}</span>
                    <span className="block text-sm text-muted-foreground">Old</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-semibold mt-8 mb-4">Action Items</h3>
        <div className="space-y-4">
          {loading ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">Analyzing...</CardContent></Card>
          ) : analysis.issues.length === 0 ? (
            <Card><CardContent className="p-6 flex items-center text-emerald-500"><ShieldCheck className="mr-2" /> No security issues found. Great job!</CardContent></Card>
          ) : (
            analysis.issues.map((issue, idx) => (
              <Card key={idx} className="border-l-4 border-l-destructive">
                <CardHeader className="py-4">
                  <div className="flex items-start gap-4">
                    {issue.type === 'weak' && <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />}
                    {issue.type === 'reused' && <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />}
                    {issue.type === 'old' && <Info className="h-5 w-5 text-blue-500 mt-0.5" />}
                    <div>
                      <CardTitle className="text-base">{issue.site}</CardTitle>
                      <CardDescription className="mt-1 text-sm">{issue.message}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
