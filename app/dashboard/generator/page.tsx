"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Copy, RefreshCw, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { generatePassword, calculatePasswordStrength } from "@/lib/encryption"
import { useToast } from "@/components/ui/use-toast"

export default function GeneratorPage() {
  const [length, setLength] = useState([16])
  const [options, setOptions] = useState({
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  })
  const [password, setPassword] = useState(() => generatePassword(16, {
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  }))
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleGenerate = () => {
    const newPassword = generatePassword(length[0], options)
    setPassword(newPassword)
    setCopied(false)
  }

  const handleOptionChange = (key: keyof typeof options, value: boolean) => {
    const newOptions = { ...options, [key]: value }
    setOptions(newOptions)
    const newPassword = generatePassword(length[0], newOptions)
    setPassword(newPassword)
    setCopied(false)
  }

  const handleLengthChange = (val: number[]) => {
    setLength(val)
    const newPassword = generatePassword(val[0], options)
    setPassword(newPassword)
    setCopied(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    toast({
      title: "Copied to clipboard",
      description: "Password is ready to use.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const strength = calculatePasswordStrength(password)
  
  let strengthColor = "bg-red-500"
  let strengthLabel = "Weak"
  if (strength >= 50) {
    strengthColor = "bg-amber-500"
    strengthLabel = "Fair"
  }
  if (strength >= 80) {
    strengthColor = "bg-emerald-500"
    strengthLabel = "Strong"
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Password Generator</h2>
          <p className="text-muted-foreground">Create strong, secure passwords instantly.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generated Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Input 
                value={password} 
                readOnly 
                className="text-2xl font-mono h-16 text-center tracking-wider pr-24"
              />
              <div className="absolute right-2 top-2 flex space-x-2">
                <Button variant="ghost" size="icon" onClick={handleGenerate}>
                  <RefreshCw className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Strength: <span className="font-semibold">{strengthLabel}</span></span>
              </div>
              <Progress value={strength} indicatorClassName={strengthColor} />
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Length</Label>
                  <span className="font-mono">{length[0]}</span>
                </div>
                <Slider 
                  value={length} 
                  onValueChange={handleLengthChange} 
                  max={64} 
                  min={8} 
                  step={1} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                  <Label htmlFor="upper">Uppercase (A-Z)</Label>
                  <Switch 
                    id="upper" 
                    checked={options.upper}
                    onCheckedChange={(c) => handleOptionChange('upper', c)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                  <Label htmlFor="lower">Lowercase (a-z)</Label>
                  <Switch 
                    id="lower" 
                    checked={options.lower}
                    onCheckedChange={(c) => handleOptionChange('lower', c)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                  <Label htmlFor="numbers">Numbers (0-9)</Label>
                  <Switch 
                    id="numbers" 
                    checked={options.numbers}
                    onCheckedChange={(c) => handleOptionChange('numbers', c)}
                  />
                </div>
                <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                  <Label htmlFor="symbols">Symbols (!@#$)</Label>
                  <Switch 
                    id="symbols" 
                    checked={options.symbols}
                    onCheckedChange={(c) => handleOptionChange('symbols', c)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
