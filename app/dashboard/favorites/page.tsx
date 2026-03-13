"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useVaultStore } from "@/store/useStore"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where } from "firebase/firestore"
import { decryptVaultItem } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"
import { Star, Globe, CreditCard, MapPin, FileText, ExternalLink, Copy, Folder } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface FavoriteItem {
  id: string
  type: 'login' | 'card' | 'address' | 'note'
  title: string
  subtitle: string
  folder?: string
  tags: string[]
  url?: string
  copyValue?: string
  copyLabel?: string
}

export default function FavoritesPage() {
  const { user, masterKey } = useVaultStore()
  const { toast } = useToast()
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user || !masterKey) return
      setLoading(true)
      try {
        const items: FavoriteItem[] = []
        
        // Fetch Logins
        const loginsQ = query(collection(db, "logins"), where("user_id", "==", user.uid))
        const loginsSnap = await getDocs(loginsQ)
        for (const doc of loginsSnap.docs) {
          try {
            const data = doc.data()
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            if (decrypted.isFavorite) {
              items.push({
                id: doc.id,
                type: 'login',
                title: decrypted.website_name,
                subtitle: decrypted.username,
                folder: decrypted.folder,
                tags: decrypted.tags || [],
                url: decrypted.website_url,
                copyValue: decrypted.password,
                copyLabel: "Password"
              })
            }
          } catch (e) {}
        }

        // Fetch Cards
        const cardsQ = query(collection(db, "cards"), where("user_id", "==", user.uid))
        const cardsSnap = await getDocs(cardsQ)
        for (const doc of cardsSnap.docs) {
          try {
            const data = doc.data()
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            if (decrypted.isFavorite) {
              items.push({
                id: doc.id,
                type: 'card',
                title: decrypted.title,
                subtitle: decrypted.cardholder_name,
                folder: decrypted.folder,
                tags: decrypted.tags || [],
                copyValue: decrypted.card_number,
                copyLabel: "Card Number"
              })
            }
          } catch (e) {}
        }

        // Fetch Addresses
        const addressesQ = query(collection(db, "addresses"), where("user_id", "==", user.uid))
        const addressesSnap = await getDocs(addressesQ)
        for (const doc of addressesSnap.docs) {
          try {
            const data = doc.data()
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            if (decrypted.isFavorite) {
              items.push({
                id: doc.id,
                type: 'address',
                title: decrypted.title,
                subtitle: decrypted.full_name,
                folder: decrypted.folder,
                tags: decrypted.tags || [],
                copyValue: `${decrypted.full_name}\n${decrypted.address_line_1}\n${decrypted.city}, ${decrypted.state} ${decrypted.zip_code}`,
                copyLabel: "Address"
              })
            }
          } catch (e) {}
        }

        // Fetch Notes
        const notesQ = query(collection(db, "notes"), where("user_id", "==", user.uid))
        const notesSnap = await getDocs(notesQ)
        for (const doc of notesSnap.docs) {
          try {
            const data = doc.data()
            const decrypted = await decryptVaultItem(data.encrypted_payload, data.iv, masterKey)
            if (decrypted.isFavorite) {
              items.push({
                id: doc.id,
                type: 'note',
                title: decrypted.title,
                subtitle: "Secure Note",
                folder: decrypted.folder,
                tags: decrypted.tags || [],
                copyValue: decrypted.content,
                copyLabel: "Content"
              })
            }
          } catch (e) {}
        }

        setFavorites(items)
      } catch (error) {
        console.error("Error fetching favorites:", error)
        toast({ title: "Error", description: "Failed to load favorites.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchFavorites()
  }, [user, masterKey, toast])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'login': return <Globe className="h-5 w-5 text-blue-500" />
      case 'card': return <CreditCard className="h-5 w-5 text-emerald-500" />
      case 'address': return <MapPin className="h-5 w-5 text-orange-500" />
      case 'note': return <FileText className="h-5 w-5 text-purple-500" />
      default: return <Star className="h-5 w-5 text-yellow-500" />
    }
  }

  const getRoute = (type: string) => {
    switch (type) {
      case 'login': return '/dashboard/logins'
      case 'card': return '/dashboard/cards'
      case 'address': return '/dashboard/addresses'
      case 'note': return '/dashboard/notes'
      default: return '/dashboard'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" /> Favorites
          </h2>
          <p className="text-muted-foreground mt-2">Quick access to your most important vault items.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Decrypting favorites...
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            No favorites found. Star items in your vault to see them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((item) => (
              <Card key={item.id} className="flex flex-col hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push(getRoute(item.type))}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-md">
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription>{item.subtitle}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex gap-1 flex-wrap mt-2">
                    {item.folder && (
                      <Badge variant="outline" className="bg-muted">
                        <Folder className="mr-1 h-3 w-3" />
                        {item.folder}
                      </Badge>
                    )}
                    {Array.isArray(item.tags) && item.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <div className="p-4 pt-0 flex gap-2" onClick={e => e.stopPropagation()}>
                  {item.copyValue && (
                    <Button variant="secondary" className="flex-1" onClick={() => copyToClipboard(item.copyValue!, item.copyLabel || "Value")}>
                      <Copy className="mr-2 h-4 w-4" /> Copy {item.copyLabel}
                    </Button>
                  )}
                  {item.url && (
                    <Button variant="outline" size="icon" onClick={() => window.open(item.url, "_blank")}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
