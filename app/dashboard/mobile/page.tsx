"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Smartphone, Download, CheckCircle2, Info, Share2, PlusSquare, Shield } from "lucide-react"
import { motion } from "motion/react"
import { QRCodeSVG } from "qrcode.react"

export default function MobileAppPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    if (window.matchMedia("(display-mode: standalone)").matches) {
      requestAnimationFrame(() => setIsInstalled(true))
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  const appUrl = mounted ? window.location.origin : ""

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Mobile Application</h2>
          <p className="text-muted-foreground">Access your vault on the go with our Android-compatible application.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="h-6 w-6 text-emerald-500" />
                <CardTitle>Progressive Web App (PWA)</CardTitle>
              </div>
              <CardDescription>
                Install SecureVault directly on your Android device for a native-like experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Real-time synchronization with web vault</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Biometric unlock support (via browser)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Offline access to cached credentials</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>App icon on your home screen</span>
                </div>
              </div>

              {isInstalled ? (
                <div className="rounded-lg bg-emerald-500/10 p-4 text-center text-emerald-500 font-medium">
                  App is already installed on this device!
                </div>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Download className="mr-2 h-4 w-4" /> Install Now
                </Button>
              ) : (
                <div className="rounded-lg bg-blue-500/10 p-4 text-sm text-blue-400 flex gap-3">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>To install on Android: Open this page in Chrome, tap the three dots menu (⋮), and select &quot;Install app&quot;.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation Guide</CardTitle>
              <CardDescription>Follow these steps to set up SecureVault on your phone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold">1</div>
                  <div>
                    <p className="font-medium">Open in Chrome</p>
                    <p className="text-sm text-muted-foreground">Navigate to this vault URL on your Android device using Google Chrome.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold">2</div>
                  <div>
                    <p className="font-medium">Tap Menu</p>
                    <p className="text-sm text-muted-foreground">Tap the three-dot menu icon (⋮) in the top right corner of Chrome.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold">3</div>
                  <div>
                    <p className="font-medium">Install App</p>
                    <p className="text-sm text-muted-foreground">Select &quot;Install app&quot; or &quot;Add to Home screen&quot; from the menu.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3"
           >
             <Share2 className="h-8 w-8 text-blue-500" />
             <h3 className="font-semibold">Share to Mobile</h3>
             <p className="text-xs text-muted-foreground">Scan this QR code or share the link to your mobile device to start installation.</p>
             <div className="h-32 w-32 bg-white rounded-lg p-2 flex items-center justify-center">
                {appUrl && (
                  <QRCodeSVG 
                    value={appUrl} 
                    size={112}
                    level="H"
                    includeMargin={false}
                  />
                )}
             </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3"
           >
             <PlusSquare className="h-8 w-8 text-emerald-500" />
             <h3 className="font-semibold">Auto-Sync</h3>
             <p className="text-xs text-muted-foreground">All your passwords, cards, and notes are instantly available on all devices.</p>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="rounded-xl border bg-card p-6 flex flex-col items-center text-center gap-3"
           >
             <Shield className="h-8 w-8 text-purple-500" />
             <h3 className="font-semibold">Secure Storage</h3>
             <p className="text-xs text-muted-foreground">Your master key never leaves your device, even on mobile.</p>
           </motion.div>
        </div>
      </div>
    </DashboardLayout>
  )
}
