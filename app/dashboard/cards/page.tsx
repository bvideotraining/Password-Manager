"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreVertical, Copy, Trash, CreditCard, Eye, EyeOff, Star, Folder } from "lucide-react"
import { useVaultStore } from "@/store/useStore"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { encryptVaultItem, decryptVaultItem } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface CardItem {
  id: string
  title: string
  cardholder_name: string
  card_number: string
  expiration_date: string
  cvv: string
  pin?: string
  notes?: string
  tags: string[]
  folder?: string
  isFavorite?: boolean
  created_at: string
  updated_at: string
}

export default function CardsPage() {
  const { user, masterKey } = useVaultStore()
  const { toast } = useToast()
  const [cards, setCards] = useState<CardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [visibleCards, setVisibleCards] = useState<Record<string, boolean>>({})

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    cardholder_name: "",
    card_number: "",
    expiration_date: "",
    cvv: "",
    pin: "",
    notes: "",
    tags: "",
    folder: "",
  })

  useEffect(() => {
    const fetchCards = async () => {
      if (!user || !masterKey) return
      setLoading(true)
      try {
        const q = query(collection(db, "cards"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        const items: CardItem[] = []

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
            console.error("Failed to decrypt card", docSnapshot.id)
          }
        }
        setCards(items)
      } catch (error) {
        console.error("Error fetching cards:", error)
        toast({ title: "Error", description: "Failed to load credit cards.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [user, masterKey, toast])

  const fetchCardsManual = async () => {
    if (!user || !masterKey) return
    setLoading(true)
    try {
      const q = query(collection(db, "cards"), where("user_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const items: CardItem[] = []

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
          console.error("Failed to decrypt card", docSnapshot.id)
        }
      }
      setCards(items)
    } catch (error) {
      console.error("Error fetching cards:", error)
      toast({ title: "Error", description: "Failed to load credit cards.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !masterKey) return

    try {
      const payload = {
        title: formData.title,
        cardholder_name: formData.cardholder_name,
        card_number: formData.card_number.replace(/\s/g, ''), // Remove spaces
        expiration_date: formData.expiration_date,
        cvv: formData.cvv,
        pin: formData.pin,
        notes: formData.notes,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        folder: formData.folder,
        isFavorite: false,
      }

      const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)

      const now = new Date().toISOString()
      await addDoc(collection(db, "cards"), {
        user_id: user.uid,
        encrypted_payload: ciphertext,
        iv: iv,
        created_at: now,
        updated_at: now,
      })

      toast({ title: "Success", description: "Credit card saved securely." })
      setIsAddModalOpen(false)
      setFormData({ 
        title: "", cardholder_name: "", card_number: "", expiration_date: "", 
        cvv: "", pin: "", notes: "", tags: "", folder: "" 
      })
      fetchCardsManual()
    } catch (error) {
      console.error("Error adding card:", error)
      toast({ title: "Error", description: "Failed to save credit card.", variant: "destructive" })
    }
  }

  const toggleFavorite = async (card: CardItem) => {
    if (!user || !masterKey) return
    try {
      const payload = {
        title: card.title,
        cardholder_name: card.cardholder_name,
        card_number: card.card_number,
        expiration_date: card.expiration_date,
        cvv: card.cvv,
        pin: card.pin,
        notes: card.notes,
        tags: card.tags,
        folder: card.folder,
        isFavorite: !card.isFavorite,
      }
      const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)
      await updateDoc(doc(db, "cards", card.id), {
        encrypted_payload: ciphertext,
        iv: iv,
        updated_at: new Date().toISOString(),
      })
      setCards(cards.map(c => c.id === card.id ? { ...c, isFavorite: !c.isFavorite } : c))
    } catch (error) {
      toast({ title: "Error", description: "Failed to update favorite status.", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credit card?")) return
    try {
      await deleteDoc(doc(db, "cards", id))
      toast({ title: "Deleted", description: "Credit card removed from vault." })
      setCards(cards.filter(c => c.id !== id))
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete credit card.", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${type} copied to clipboard.` })
  }

  const toggleCardVisibility = (id: string) => {
    setVisibleCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const formatCardNumber = (number: string) => {
    const v = number.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return number
    }
  }

  const maskCardNumber = (number: string) => {
    if (number.length < 4) return number
    return `•••• •••• •••• ${number.slice(-4)}`
  }

  const filteredCards = cards.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.cardholder_name.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Credit Cards</h2>
            <p className="text-muted-foreground">Manage your secure credit and debit cards.</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Card
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Credit Card</DialogTitle>
                <DialogDescription>
                  Store a new credit or debit card securely in your encrypted vault.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCard}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title (e.g. Personal Visa)</Label>
                    <Input id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="Personal Visa" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cardholder_name">Cardholder Name</Label>
                    <Input id="cardholder_name" value={formData.cardholder_name} onChange={e => setFormData({...formData, cardholder_name: e.target.value})} required placeholder="John Doe" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="card_number">Card Number</Label>
                    <Input 
                      id="card_number" 
                      value={formatCardNumber(formData.card_number)} 
                      onChange={e => setFormData({...formData, card_number: e.target.value})} 
                      required 
                      placeholder="0000 0000 0000 0000" 
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="expiration_date">Expiration Date</Label>
                      <Input id="expiration_date" value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} required placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cvv">CVV / CVC</Label>
                      <Input id="cvv" type="password" value={formData.cvv} onChange={e => setFormData({...formData, cvv: e.target.value})} required placeholder="123" maxLength={4} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="pin">PIN (Optional)</Label>
                    <Input id="pin" type="password" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} placeholder="1234" maxLength={6} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="folder">Folder</Label>
                    <Input id="folder" value={formData.folder} onChange={e => setFormData({...formData, folder: e.target.value})} placeholder="e.g. Work" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="personal, business" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Card</Button>
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
              placeholder="Search cards..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Decrypting credit cards...
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            No credit cards found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCards.map((card) => (
              <Card key={card.id} className="flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <CardHeader className="pb-2 pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-emerald-500" />
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>{card.title || "Untitled Card"}</span>
                        {card.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleFavorite(card)}>
                          <Star className={`mr-2 h-4 w-4 ${card.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} /> 
                          {card.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(card.card_number, "Card Number")}>
                          <Copy className="mr-2 h-4 w-4" /> Copy Card Number
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(card.cvv, "CVV")}>
                          <Copy className="mr-2 h-4 w-4" /> Copy CVV
                        </DropdownMenuItem>
                        {card.pin && (
                          <DropdownMenuItem onClick={() => copyToClipboard(card.pin!, "PIN")}>
                            <Copy className="mr-2 h-4 w-4" /> Copy PIN
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(card.id)} className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    {card.cardholder_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg font-mono relative group">
                    <div className="text-lg tracking-widest flex justify-between items-center">
                      <span>{visibleCards[card.id] ? formatCardNumber(card.card_number) : maskCardNumber(card.card_number)}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleCardVisibility(card.id)}
                      >
                        {visibleCards[card.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex justify-between mt-4 text-sm text-muted-foreground">
                      <div>
                        <span className="text-xs uppercase block">Expires</span>
                        <span className={visibleCards[card.id] ? "text-foreground" : ""}>{visibleCards[card.id] ? card.expiration_date : "••/••"}</span>
                      </div>
                      <div>
                        <span className="text-xs uppercase block">CVV</span>
                        <span className={visibleCards[card.id] ? "text-foreground" : ""}>{visibleCards[card.id] ? card.cvv : "•••"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-1 flex-wrap">
                    {card.folder && (
                      <Badge variant="outline" className="bg-muted">
                        <Folder className="mr-1 h-3 w-3" />
                        {card.folder}
                      </Badge>
                    )}
                    {Array.isArray(card.tags) && card.tags.map(tag => (
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
