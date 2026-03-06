"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreVertical, Copy, Trash, MapPin } from "lucide-react"
import { useVaultStore } from "@/store/useStore"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { encryptVaultItem, decryptVaultItem } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface AddressItem {
  id: string
  title: string
  full_name: string
  address_line_1: string
  address_line_2?: string
  city: string
  state: string
  zip_code: string
  country: string
  phone?: string
  tags: string[]
  created_at: string
  updated_at: string
}

export default function AddressesPage() {
  const { user, masterKey } = useVaultStore()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    full_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    phone: "",
    tags: "",
  })

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user || !masterKey) return
      setLoading(true)
      try {
        const q = query(collection(db, "addresses"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        const items: AddressItem[] = []

        for (const docSnapshot of querySnapshot.docs) {
          const data = docSnapshot.data()
          try {
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            items.push({
              id: docSnapshot.id,
              ...decrypted,
              created_at: data.created_at,
              updated_at: data.updated_at,
            })
          } catch (e) {
            console.error("Failed to decrypt address", docSnapshot.id)
          }
        }
        setAddresses(items)
      } catch (error) {
        console.error("Error fetching addresses:", error)
        toast({ title: "Error", description: "Failed to load addresses.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchAddresses()
  }, [user, masterKey, toast])

  const fetchAddressesManual = async () => {
    if (!user || !masterKey) return
    setLoading(true)
    try {
      const q = query(collection(db, "addresses"), where("user_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const items: AddressItem[] = []

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data()
        try {
          const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
          items.push({
            id: docSnapshot.id,
            ...decrypted,
            created_at: data.created_at,
            updated_at: data.updated_at,
          })
        } catch (e) {
          console.error("Failed to decrypt address", docSnapshot.id)
        }
      }
      setAddresses(items)
    } catch (error) {
      console.error("Error fetching addresses:", error)
      toast({ title: "Error", description: "Failed to load addresses.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !masterKey) return

    try {
      const payload = {
        title: formData.title,
        full_name: formData.full_name,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        phone: formData.phone,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
      }

      const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)

      const now = new Date().toISOString()
      await addDoc(collection(db, "addresses"), {
        user_id: user.uid,
        encrypted_payload: ciphertext,
        iv: iv,
        created_at: now,
        updated_at: now,
      })

      toast({ title: "Success", description: "Address saved securely." })
      setIsAddModalOpen(false)
      setFormData({ 
        title: "", full_name: "", address_line_1: "", address_line_2: "", 
        city: "", state: "", zip_code: "", country: "", phone: "", tags: "" 
      })
      fetchAddressesManual()
    } catch (error) {
      console.error("Error adding address:", error)
      toast({ title: "Error", description: "Failed to save address.", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return
    try {
      await deleteDoc(doc(db, "addresses", id))
      toast({ title: "Deleted", description: "Address removed from vault." })
      setAddresses(addresses.filter(a => a.id !== id))
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete address.", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${type} copied to clipboard.` })
  }

  const filteredAddresses = addresses.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()) ||
    a.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Addresses</h2>
            <p className="text-muted-foreground">Manage your secure shipping and billing addresses.</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Address
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Address</DialogTitle>
                <DialogDescription>
                  Store a new address securely in your encrypted vault.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAddress}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title (e.g. Home, Work)</Label>
                    <Input id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="Home" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required placeholder="John Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address_line_1">Address Line 1</Label>
                    <Input id="address_line_1" value={formData.address_line_1} onChange={e => setFormData({...formData, address_line_1: e.target.value})} required placeholder="123 Main St" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address_line_2">Address Line 2 (Optional)</Label>
                    <Input id="address_line_2" value={formData.address_line_2} onChange={e => setFormData({...formData, address_line_2: e.target.value})} placeholder="Apt 4B" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} required placeholder="New York" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State / Province</Label>
                      <Input id="state" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} required placeholder="NY" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="zip_code">Zip / Postal Code</Label>
                      <Input id="zip_code" value={formData.zip_code} onChange={e => setFormData({...formData, zip_code: e.target.value})} required placeholder="10001" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} required placeholder="USA" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 123-4567" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="personal, shipping" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Address</Button>
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
              placeholder="Search addresses..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Decrypting addresses...
          </div>
        ) : filteredAddresses.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            No addresses found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAddresses.map((address) => (
              <Card key={address.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-lg">{address.title}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const fullAddress = `${address.full_name}\n${address.address_line_1}${address.address_line_2 ? '\n' + address.address_line_2 : ''}\n${address.city}, ${address.state} ${address.zip_code}\n${address.country}`;
                          copyToClipboard(fullAddress, "Full Address");
                        }}>
                          <Copy className="mr-2 h-4 w-4" /> Copy Full Address
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(address.id)} className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {address.full_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-md">
                    <p>{address.address_line_1}</p>
                    {address.address_line_2 && <p>{address.address_line_2}</p>}
                    <p>{address.city}, {address.state} {address.zip_code}</p>
                    <p>{address.country}</p>
                    {address.phone && <p className="pt-2 text-xs">📞 {address.phone}</p>}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-1 flex-wrap">
                    {address.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
