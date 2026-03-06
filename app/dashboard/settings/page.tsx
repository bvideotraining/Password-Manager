"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVaultStore } from "@/store/useStore"
import { Download, Upload, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { user } = useVaultStore()
  const { toast } = useToast()

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
