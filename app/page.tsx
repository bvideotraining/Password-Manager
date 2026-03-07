"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Shield, Lock, Mail, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { auth, db } from "@/lib/firebase"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth"
import { doc, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore"
import { deriveMasterKey, generateSalt, bufferToBase64, base64ToBuffer, encryptVaultItem, decryptVaultItem, deriveKeyFromPin, importKey } from "@/lib/encryption"
import { useVaultStore } from "@/store/useStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [loginMethod, setLoginMethod] = useState<"password" | "pin">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [masterPassword, setMasterPassword] = useState("")
  const [pin, setPin] = useState("")
  const [loading, setLoading] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [savedPinUser, setSavedPinUser] = useState<{ uid: string; email: string } | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()
  const { setUser, setMasterKey, isUnlocked } = useVaultStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser({ uid: user.uid, email: user.email })
        // Check if this user has a PIN saved on this device
        const savedPinData = localStorage.getItem(`vault_pin_${user.uid}`)
        if (savedPinData) {
          setSavedPinUser({ uid: user.uid, email: user.email || "" })
          setLoginMethod("pin")
        }
      } else {
        setUser(null)
        setSavedPinUser(null)
      }
      setAuthChecking(false)
    })
    return () => unsubscribe()
  }, [setUser])

  useEffect(() => {
    if (isUnlocked) {
      router.push("/dashboard")
    }
  }, [isUnlocked, router])

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!savedPinUser) return
    setLoading(true)

    try {
      const savedPinData = localStorage.getItem(`vault_pin_${savedPinUser.uid}`)
      if (!savedPinData) throw new Error("PIN data not found.")

      const { ciphertext, iv } = JSON.parse(savedPinData)
      
      // Get user's salt from Firestore to derive the PIN key
      const userDoc = await getDoc(doc(db, "users", savedPinUser.uid))
      if (!userDoc.exists()) throw new Error("User data not found.")
      
      const userData = userDoc.data()
      const salt = new Uint8Array(base64ToBuffer(userData.salt))
      
      // Derive PIN key
      const pinKey = await deriveKeyFromPin(pin, salt)
      
      // Decrypt the exported master key
      const decrypted = await decryptVaultItem(ciphertext, iv, pinKey)
      const masterKey = await importKey(decrypted.key)
      
      // Set in store
      setMasterKey(masterKey, userData.salt)
      
      toast({
        title: "Vault Unlocked with PIN",
        description: "Welcome back.",
      })
      
      router.push("/dashboard")
    } catch (error: any) {
      console.error("PIN login error:", error)
      toast({
        title: "PIN Unlock Failed",
        description: "Incorrect PIN or corrupted data.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // 1. Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // 2. Fetch user's salt from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (!userDoc.exists()) {
          throw new Error("User data not found. Please contact support.")
        }
        
        const userData = userDoc.data()
        const saltBase64 = userData.salt
        const salt = new Uint8Array(base64ToBuffer(saltBase64))

        // 3. Derive Master Key
        const key = await deriveMasterKey(masterPassword, salt)
        
        // 4. Verify Master Key
        if (userData.verification_payload) {
          try {
            await decryptVaultItem(userData.verification_payload.ciphertext, userData.verification_payload.iv, key)
          } catch (err) {
            throw new Error("Invalid Master Password.")
          }
        } else {
          // Fallback for older accounts: try to decrypt one item to verify
          const q = query(collection(db, "logins"), where("user_id", "==", user.uid))
          const querySnapshot = await getDocs(q)
          if (!querySnapshot.empty) {
            const firstItem = querySnapshot.docs[0].data()
            try {
              await decryptVaultItem(firstItem.encrypted_payload, firstItem.iv, key)
              // If successful, create and save a verification payload for future
              const verificationPayload = await encryptVaultItem({ valid: true }, key)
              await setDoc(doc(db, "users", user.uid), { verification_payload: verificationPayload }, { merge: true })
            } catch (err) {
              throw new Error("Invalid Master Password.")
            }
          } else {
            // No items and no verification payload. Assume password is correct and create payload.
            const verificationPayload = await encryptVaultItem({ valid: true }, key)
            await setDoc(doc(db, "users", user.uid), { verification_payload: verificationPayload }, { merge: true })
          }
        }

        // 5. Set in store
        setMasterKey(key, saltBase64)
        
        toast({
          title: "Vault Unlocked",
          description: "Welcome back to SecureVault.",
        })
        
        router.push("/dashboard")

      } else {
        // 1. Create Firebase User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // 2. Generate Salt and Derive Master Key
        const salt = await generateSalt()
        const key = await deriveMasterKey(masterPassword, salt)
        const saltBase64 = bufferToBase64(salt.buffer)

        // 3. Create a verification payload to check the master password on future logins
        const verificationPayload = await encryptVaultItem({ valid: true }, key)

        // 4. Store Salt and Verification Payload in Firestore (NEVER store the master password or key)
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          salt: saltBase64,
          verification_payload: verificationPayload,
          createdAt: new Date().toISOString()
        })

        // 5. Set in store
        setMasterKey(key, saltBase64)
        
        toast({
          title: "Account Created",
          description: "Your vault has been initialized securely.",
        })
        
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Auth error:", error)
      toast({
        title: "Authentication Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Shield className="h-12 w-12 animate-pulse text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-md"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-emerald-500/10 p-3">
                <Shield className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isLogin ? "Unlock Vault" : "Create Vault"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Enter your credentials to access your secure vault" 
                : "Set up your zero-knowledge encrypted vault"}
            </CardDescription>
          </CardHeader>

          {isLogin && savedPinUser ? (
            <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as "password" | "pin")} className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="password">Password</TabsTrigger>
                  <TabsTrigger value="pin">PIN Code</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="password">
                <form onSubmit={handleAuth}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="m@example.com" 
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Account Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password" 
                          type="password" 
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="masterPassword">Master Password</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-3 h-4 w-4 text-emerald-500" />
                        <Input 
                          id="masterPassword" 
                          type="password" 
                          className="pl-9 border-emerald-500/30 focus-visible:ring-emerald-500"
                          value={masterPassword}
                          onChange={(e) => setMasterPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Processing..." : "Unlock Vault"}
                    </Button>
                    <AuthFooter isLogin={isLogin} setIsLogin={setIsLogin} />
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="pin">
                <form onSubmit={handlePinLogin}>
                  <CardContent className="space-y-4 pt-4">
                    <div className="text-center space-y-2 mb-4">
                      <p className="text-sm font-medium">{savedPinUser.email}</p>
                      <p className="text-xs text-muted-foreground">Enter your 6-digit PIN to unlock</p>
                    </div>
                    <div className="flex justify-center">
                      <Input
                        type="password"
                        maxLength={6}
                        className="w-32 text-center text-2xl tracking-[0.5em] font-bold"
                        placeholder="••••••"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full" disabled={loading || pin.length !== 6}>
                      {loading ? "Unlocking..." : "Unlock with PIN"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      type="button" 
                      className="text-xs"
                      onClick={() => {
                        setSavedPinUser(null)
                        setLoginMethod("password")
                      }}
                    >
                      Use another account
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            <form onSubmit={handleAuth}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="m@example.com" 
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Account Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="masterPassword">Master Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-emerald-500" />
                    <Input 
                      id="masterPassword" 
                      type="password" 
                      className="pl-9 border-emerald-500/30 focus-visible:ring-emerald-500"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      required
                    />
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This password encrypts your data. If you lose it, your data cannot be recovered.
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : (isLogin ? "Unlock Vault" : "Initialize Vault")}
                </Button>
                <AuthFooter isLogin={isLogin} setIsLogin={setIsLogin} />
              </CardFooter>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

function AuthFooter({ isLogin, setIsLogin }: { isLogin: boolean; setIsLogin: (v: boolean) => void }) {
  return (
    <>
      <div className="text-center text-sm">
        <span className="text-muted-foreground">
          {isLogin ? "Don't have a vault? " : "Already have a vault? "}
        </span>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="font-medium text-emerald-500 hover:underline"
        >
          {isLogin ? "Create one" : "Sign in"}
        </button>
      </div>
      <div className="text-center text-sm mt-4 pt-4 border-t border-border/50">
        <a href="/api/extension/download" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-emerald-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download Chrome Extension
        </a>
      </div>
    </>
  )
}
