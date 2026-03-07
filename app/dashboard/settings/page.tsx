"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVaultStore } from "@/store/useStore"
import { Download, Upload, Trash2, Smartphone, ShieldCheck, Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { encryptVaultItem, deriveKeyFromPin, exportKey, base64ToBuffer } from "@/lib/encryption"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  const { user, masterKey, salt, hasPin, setHasPin } = useVaultStore()
  const { toast } = useToast()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [isSettingPin, setIsSettingPin] = useState(false)

  useEffect(() => {
    const savedPinData = localStorage.getItem(`vault_pin_${user?.uid}`)
    setHasPin(!!savedPinData)
  }, [user?.uid, setHasPin])

  const handleSetPin = async () => {
    if (pin.length !== 6 || isNaN(Number(pin))) {
      toast({ title: "Invalid PIN", description: "PIN must be 6 digits.", variant: "destructive" })
      return
    }
    if (pin !== confirmPin) {
      toast({ title: "PIN Mismatch", description: "PINs do not match.", variant: "destructive" })
      return
    }
    if (!masterKey || !salt) return

    try {
      setIsSettingPin(true)
      
      if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        throw new Error("Encryption is not supported in this browser environment.")
      }

      if (!salt) throw new Error("Vault salt is missing.")
      if (!masterKey) throw new Error("Vault is locked or master key is missing.")

      const pinSalt = new Uint8Array(base64ToBuffer(salt))
      const pinKey = await deriveKeyFromPin(pin, pinSalt)
      
      // Export master key to string
      const exportedMasterKey = await exportKey(masterKey)
      
      // Encrypt exported master key with PIN key
      const encryptedMasterKey = await encryptVaultItem({ key: exportedMasterKey }, pinKey)
      
      // Store in local storage
      if (!user?.uid) throw new Error("User ID is missing.")
      localStorage.setItem(`vault_pin_${user.uid}`, JSON.stringify(encryptedMasterKey))
      setHasPin(true)
      setPin("")
      setConfirmPin("")
      
      toast({
        title: "PIN Set Successfully",
        description: "You can now use this PIN to quickly unlock your vault on this device.",
      })
    } catch (error: any) {
      console.error("Error setting PIN:", error)
      toast({ 
        title: "Error", 
        description: error.message || "Failed to set PIN. Please try again.", 
        variant: "destructive" 
      })
    } finally {
      setIsSettingPin(false)
    }
  }

  const handleRemovePin = () => {
    localStorage.removeItem(`vault_pin_${user?.uid}`)
    setHasPin(false)
    toast({ title: "PIN Removed", description: "Quick unlock has been disabled for this device." })
  }

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Your encrypted vault is being prepared for download.",
    })
    // In a real app, this would download the encrypted JSON payload
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account and vault preferences.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your SecureVault account details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                <p className="text-lg">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account ID</p>
                <p className="text-sm font-mono text-muted-foreground">{user?.uid}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Unlock (PIN)</CardTitle>
            <CardDescription>Set a 6-digit PIN to quickly unlock your vault on this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPin ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium text-emerald-500">PIN Protection Active</p>
                    <p className="text-sm text-emerald-500/70">Quick unlock is enabled for this browser.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleRemovePin} className="border-emerald-500/20 hover:bg-emerald-500/10">
                  Disable PIN
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">6-Digit PIN</Label>
                    <Input
                      id="pin"
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirm PIN</Label>
                    <Input
                      id="confirmPin"
                      type="password"
                      maxLength={6}
                      placeholder="••••••"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleSetPin} disabled={isSettingPin || pin.length !== 6}>
                  <Lock className="mr-2 h-4 w-4" /> Enable Quick Unlock
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your PIN is device-specific and never leaves your browser. It securely stores your master key locally.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Import or export your encrypted vault data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export Encrypted Vault
              </Button>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" /> Import Passwords (CSV)
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Account & Vault
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Deleting your account will permanently erase all encrypted data from our servers. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
