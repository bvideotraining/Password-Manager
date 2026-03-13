'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="bg-card border border-destructive/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-8">
          We encountered an unexpected error. This might be due to a temporary issue or malformed data.
        </p>

        <div className="space-y-4">
          <Button 
            onClick={() => reset()} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Try again
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'} 
            className="w-full"
            variant="outline"
          >
            Go to Home
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
            <p className="text-xs font-mono text-destructive break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="text-[10px] mt-2 text-muted-foreground leading-tight">
                {error.stack}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
