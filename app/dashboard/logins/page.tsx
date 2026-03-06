"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreVertical, Copy, Edit, Trash, ExternalLink, Eye, EyeOff } from "lucide-react"
import { useVaultStore } from "@/store/useStore"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { encryptVaultItem, decryptVaultItem } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface LoginItem {
  id: string
  website_name: string
  website_url: string
  username: string
  password?: string // Decrypted
  notes: string
  tags: string[]
  created_at: string
  updated_at: string
  last_used: string
}

export default function LoginsPage() {
  const { user, masterKey } = useVaultStore()
  const { toast } = useToast()
  const [logins, setLogins] = useState<LoginItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  // Form State
  const [formData, setFormData] = useState({
    website_name: "",
    website_url: "",
    username: "",
    password: "",
    notes: "",
    tags: "",
  })

  useEffect(() => {
    const fetchLogins = async () => {
      if (!user || !masterKey) return
      setLoading(true)
      try {
        const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        const items: LoginItem[] = []

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            items.push({
              id: docSnapshot.id,
              ...decrypted,
              created_at: data.created_at,
              updated_at: data.updated_at,
              last_used: data.last_used,
            })
          } catch (e) {
            console.error("Failed to decrypt item", docSnapshot.id)
          }
        }
        setLogins(items)
      } catch (error) {
        console.error("Error fetching logins:", error)
        toast({ title: "Error", description: "Failed to load vault items.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchLogins()
  }, [user, masterKey, toast])

  const fetchLoginsManual = async () => {
    if (!user || !masterKey) return
    setLoading(true)
    try {
      const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const items: LoginItem[] = []

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data()
        try {
          const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
          items.push({
            id: docSnapshot.id,
            ...decrypted,
            created_at: data.created_at,
            updated_at: data.updated_at,
            last_used: data.last_used,
          })
        } catch (e) {
          console.error("Failed to decrypt item", docSnapshot.id)
        }
      }
      setLogins(items)
    } catch (error) {
      console.error("Error fetching logins:", error)
      toast({ title: "Error", description: "Failed to load vault items.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !masterKey) return

    try {
      const payload = {
        website_name: formData.website_name,
        website_url: formData.website_url,
        username: formData.username,
        password: formData.password,
        notes: formData.notes,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
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

      toast({ title: "Success", description: "Login saved securely." })
      setIsAddModalOpen(false)
      setFormData({ website_name: "", website_url: "", username: "", password: "", notes: "", tags: "" })
      fetchLoginsManual()
    } catch (error) {
      console.error("Error adding login:", error)
      toast({ title: "Error", description: "Failed to save login.", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    try {
      await deleteDoc(doc(db, "logins", id))
      toast({ title: "Deleted", description: "Item removed from vault." })
      setLogins(logins.filter(l => l.id !== id))
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${type} copied to clipboard.` })
  }

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredLogins = logins.filter(l => 
    l.website_name.toLowerCase().includes(search.toLowerCase()) ||
    l.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Logins</h2>
            <p className="text-muted-foreground">Manage your secure website credentials.</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Login
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Login</DialogTitle>
                <DialogDescription>
                  Store a new website credential in your encrypted vault.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddLogin}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="website_name">Website Name</Label>
                    <Input id="website_name" value={formData.website_name} onChange={e => setFormData({...formData, website_name: e.target.value})} required placeholder="e.g. Google" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website_url">URL</Label>
                    <Input id="website_url" type="url" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} placeholder="https://google.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username / Email</Label>
                    <Input id="username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="work, personal" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save to Vault</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search logins..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Decrypting vault...
                  </TableCell>
                </TableRow>
              ) : filteredLogins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No logins found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogins.map((login) => (
                  <TableRow key={login.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold uppercase">
                          {login.website_name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span>{login.website_name}</span>
                          <span className="text-xs text-muted-foreground">{login.website_url}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{login.username}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(login.username, "Username")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-muted-foreground">
                          {visiblePasswords[login.id] ? login.password : "••••••••••••"}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => togglePasswordVisibility(login.id)}>
                          {visiblePasswords[login.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyToClipboard(login.password || "", "Password")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {login.tags?.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(login.website_url, "_blank")}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Open Website
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyToClipboard(login.password || "", "Password")}>
                            <Copy className="mr-2 h-4 w-4" /> Copy Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(login.id)} className="text-destructive">
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}
