"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVaultStore } from "@/store/useStore"
import { Download, Upload, Trash2, Smartphone, ShieldCheck, Lock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { encryptVaultItem, decryptVaultItem, deriveKeyFromPin, exportKey, base64ToBuffer } from "@/lib/encryption"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { useRef } from "react"

export default function SettingsPage() {
  const { user, masterKey, salt, hasPin, setHasPin } = useVaultStore()
  const { toast } = useToast()
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!accountPassword) {
      toast({ title: "Password Required", description: "Please enter your account password to enable quick unlock.", variant: "destructive" })
      return
    }
    if (!masterKey || !salt) return

    try {
      setIsSettingPin(true)
      
      if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
        throw new Error("Encryption is not supported in this browser environment.")
      }

      const pinSalt = new Uint8Array(base64ToBuffer(salt))
      const pinKey = await deriveKeyFromPin(pin, pinSalt)
      
      // Export master key to string
      const exportedMasterKey = await exportKey(masterKey)
      
      // Encrypt exported master key with PIN key
      const encryptedMasterKey = await encryptVaultItem({ key: exportedMasterKey }, pinKey)
      
      // Encrypt account password with PIN key (for quick login)
      const encryptedAccountPass = await encryptVaultItem({ password: accountPassword }, pinKey)
      
      // Store in local storage
      if (!user?.uid) throw new Error("User ID is missing.")
      
      const pinData = {
        ...encryptedMasterKey,
        encryptedAccountPass,
        updatedAt: new Date().toISOString()
      }
      
      localStorage.setItem(`vault_pin_${user.uid}`, JSON.stringify(pinData))
      setHasPin(true)
      setPin("")
      setConfirmPin("")
      setAccountPassword("")
      
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

  const handleExportCSV = async () => {
    if (!user || !masterKey) return
    setIsExporting(true)
    try {
      const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const decryptedItems = []

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data()
        try {
          const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
          decryptedItems.push({
            website_name: decrypted.website_name || "",
            website_url: decrypted.website_url || "",
            username: decrypted.username || "",
            password: decrypted.password || "",
            notes: decrypted.notes || "",
          })
        } catch (e) {
          console.error("Failed to decrypt item", docSnapshot.id)
        }
      }

      if (decryptedItems.length === 0) {
        toast({ title: "No Data", description: "Your vault is empty." })
        return
      }

      const headers = ["website_name", "website_url", "username", "password", "notes"]
      const csvRows = [headers.join(",")]

      decryptedItems.forEach(item => {
        const row = headers.map(header => {
          const val = (item as any)[header] || ""
          return `"${val.toString().replace(/"/g, '""')}"`
        })
        csvRows.push(row.join(","))
      })

      const csvContent = csvRows.join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `securevault_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({ title: "Export Successful", description: `Exported ${decryptedItems.length} items.` })
    } catch (error: any) {
      console.error("Export error:", error)
      toast({ title: "Export Failed", description: error.message || "An error occurred.", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !masterKey) return

    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split("\n")
        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
        
        let importCount = 0
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          // Simple CSV parser
          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
          if (parts && parts.length >= 3) {
            const item: any = {}
            headers.forEach((header, index) => {
              if (parts[index]) {
                item[header] = parts[index].replace(/^"|"$/g, "").replace(/""/g, '"')
              }
            })

            const payload = {
              website_name: item.website_name || item.domain || "Imported",
              website_url: item.website_url || item.domain || "",
              username: item.username || "",
              password: item.password || "",
              notes: item.notes || "Imported from CSV",
              tags: ["imported"],
              folder: "",
              isFavorite: false,
            }

            const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)
            const now = new Date().toISOString()
            
            await addDoc(collection(db, "logins"), {
              user_id: user.uid,
              encrypted_payload: ciphertext,
              iv: iv,
              created_at: now,
              updated_at: now,
              last_used: now,
            })
            importCount++
          }
        }

        toast({ title: "Import Successful", description: `Imported ${importCount} items to your vault.` })
        if (fileInputRef.current) fileInputRef.current.value = ""
      } catch (error: any) {
        console.error("Import error:", error)
        toast({ title: "Import Failed", description: "Failed to parse or save CSV data.", variant: "destructive" })
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsText(file)
  }

  const handleExport = () => {
    handleExportCSV()
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
                <div className="space-y-2">
                  <Label htmlFor="accountPassword">Account Password (to enable quick login)</Label>
                  <Input
                    id="accountPassword"
                    type="password"
                    placeholder="Your account password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                  />
                </div>
                <Button onClick={handleSetPin} disabled={isSettingPin || pin.length !== 6 || !accountPassword}>
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
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              Chrome Extension
            </CardTitle>
            <CardDescription>Install the SecureVault browser extension for auto-fill and quick access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
              <h4 className="font-semibold text-sm">How to install:</h4>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Download the extension source files from our repository.</li>
                <li>Open Chrome and navigate to <code className="bg-muted px-1 rounded">chrome://extensions</code>.</li>
                <li>Enable <strong>Developer mode</strong> in the top right corner.</li>
                <li>Click <strong>Load unpacked</strong> and select the <code className="bg-muted px-1 rounded">extension</code> folder.</li>
                <li>Pin the SecureVault icon to your toolbar for easy access.</li>
              </ol>
              <div className="pt-2">
                <Button className="w-full sm:w-auto" variant="default" onClick={() => {
                  toast({ title: "Coming Soon", description: "Direct download will be available once the extension is packaged." })
                }}>
                  <Download className="mr-2 h-4 w-4" /> Download Extension (.zip)
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>The extension uses zero-knowledge encryption to keep your data safe.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Import or export your encrypted vault data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleImportCSV}
              />
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleExport} disabled={isExporting}>
                <Download className="mr-2 h-4 w-4" /> {isExporting ? "Exporting..." : "Export Passwords (CSV)"}
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importing..." : "Import Passwords (CSV)"}
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
