"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreVertical, Copy, Trash, FileText, Eye, EyeOff, Star, Folder } from "lucide-react"
import { useVaultStore } from "@/store/useStore"
import { db } from "@/lib/firebase"
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { encryptVaultItem, decryptVaultItem } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface NoteItem {
  id: string
  title: string
  content: string // Decrypted
  tags: string[]
  folder?: string
  isFavorite?: boolean
  created_at: string
  updated_at: string
}

export default function NotesPage() {
  const { user, masterKey } = useVaultStore()
  const { toast } = useToast()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [visibleNotes, setVisibleNotes] = useState<Record<string, boolean>>({})

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    folder: "",
  })

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user || !masterKey) return
      setLoading(true)
      try {
        const q = query(collection(db, "notes"), where("user_id", "==", user.uid))
        const querySnapshot = await getDocs(q)
        const items: NoteItem[] = []

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
            console.error("Failed to decrypt note", docSnapshot.id)
            // Push a placeholder for the failed note so the user can at least see it exists and delete it if needed
            items.push({
              id: docSnapshot.id,
              title: "Locked Note (Decryption Failed)",
              content: "This note could not be decrypted. It may have been encrypted with a different master password or the data is corrupted.",
              tags: ["error"],
              created_at: data.created_at,
              updated_at: data.updated_at,
              isFavorite: false,
              folder: "Error",
              isLocked: true, // Custom flag for UI
            } as any)
          }
        }
        setNotes(items)
      } catch (error) {
        console.error("Error fetching notes:", error)
        toast({ title: "Error", description: "Failed to load secure notes.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [user, masterKey, toast])

  const fetchNotesManual = async () => {
    if (!user || !masterKey) return
    setLoading(true)
    try {
      const q = query(collection(db, "notes"), where("user_id", "==", user.uid))
      const querySnapshot = await getDocs(q)
      const items: NoteItem[] = []

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
          console.error("Failed to decrypt note", docSnapshot.id)
          // Push a placeholder for the failed note so the user can at least see it exists and delete it if needed
          items.push({
            id: docSnapshot.id,
            title: "Locked Note (Decryption Failed)",
            content: "This note could not be decrypted. It may have been encrypted with a different master password or the data is corrupted.",
            tags: ["error"],
            created_at: data.created_at,
            updated_at: data.updated_at,
            isFavorite: false,
            folder: "Error",
            isLocked: true, // Custom flag for UI
          } as any)
        }
      }
      setNotes(items)
    } catch (error) {
      console.error("Error fetching notes:", error)
      toast({ title: "Error", description: "Failed to load secure notes.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !masterKey) return

    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        folder: formData.folder,
        isFavorite: false,
      }

      const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)

      const now = new Date().toISOString()
      await addDoc(collection(db, "notes"), {
        user_id: user.uid,
        encrypted_payload: ciphertext,
        iv: iv,
        created_at: now,
        updated_at: now,
      })

      toast({ title: "Success", description: "Secure note saved." })
      setIsAddModalOpen(false)
      setFormData({ title: "", content: "", tags: "", folder: "" })
      fetchNotesManual()
    } catch (error) {
      console.error("Error adding note:", error)
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" })
    }
  }

  const toggleFavorite = async (note: NoteItem) => {
    if (!user || !masterKey) return
    try {
      const payload = {
        title: note.title,
        content: note.content,
        tags: note.tags,
        folder: note.folder,
        isFavorite: !note.isFavorite,
      }
      const { ciphertext, iv } = await encryptVaultItem(payload, masterKey)
      await updateDoc(doc(db, "notes", note.id), {
        encrypted_payload: ciphertext,
        iv: iv,
        updated_at: new Date().toISOString(),
      })
      setNotes(notes.map(n => n.id === note.id ? { ...n, isFavorite: !n.isFavorite } : n))
    } catch (error) {
      toast({ title: "Error", description: "Failed to update favorite status.", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this secure note?")) return
    try {
      await deleteDoc(doc(db, "notes", id))
      toast({ title: "Deleted", description: "Note removed from vault." })
      setNotes(notes.filter(n => n.id !== id))
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete note.", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: "Note content copied to clipboard." })
  }

  const toggleNoteVisibility = (id: string) => {
    setVisibleNotes(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Secure Notes</h2>
            <p className="text-muted-foreground">Store sensitive text, recovery codes, and private information.</p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Secure Note</DialogTitle>
                <DialogDescription>
                  Store sensitive text in your encrypted vault.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddNote}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required placeholder="e.g. Recovery Codes" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="content">Secure Content</Label>
                    <Textarea 
                      id="content" 
                      value={formData.content} 
                      onChange={e => setFormData({...formData, content: e.target.value})} 
                      required 
                      placeholder="Enter your sensitive information here..."
                      className="min-h-[150px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="folder">Folder</Label>
                    <Input id="folder" value={formData.folder} onChange={e => setFormData({...formData, folder: e.target.value})} placeholder="e.g. Work" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="finance, personal, backup" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Note</Button>
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
              placeholder="Search notes..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Decrypting secure notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            No secure notes found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className={`flex flex-col ${(note as any).isLocked ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <FileText className={`h-5 w-5 ${(note as any).isLocked ? 'text-destructive' : 'text-emerald-500'}`} />
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <span>{note.title}</span>
                        {note.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
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
                        <DropdownMenuItem onClick={() => toggleFavorite(note)} disabled={(note as any).isLocked}>
                          <Star className={`mr-2 h-4 w-4 ${note.isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} /> 
                          {note.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(note.content)} disabled={(note as any).isLocked}>
                          <Copy className="mr-2 h-4 w-4" /> Copy Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(note.id)} className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardDescription>
                    Added {new Date(note.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="relative">
                    <div className={`text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded-md ${!visibleNotes[note.id] && !(note as any).isLocked ? 'blur-sm select-none' : ''}`}>
                      {note.content}
                    </div>
                    {!(note as any).isLocked && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="absolute top-2 right-2 h-7 opacity-80 hover:opacity-100"
                        onClick={() => toggleNoteVisibility(note.id)}
                      >
                        {visibleNotes[note.id] ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                        {visibleNotes[note.id] ? "Hide" : "Reveal"}
                      </Button>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex gap-1 flex-wrap">
                    {note.folder && (
                      <Badge variant="outline" className="bg-muted">
                        <Folder className="mr-1 h-3 w-3" />
                        {note.folder}
                      </Badge>
                    )}
                    {Array.isArray(note.tags) && note.tags.map(tag => (
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
