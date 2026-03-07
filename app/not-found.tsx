import Link from 'next/link'
import { Shield } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="mb-6 rounded-full bg-emerald-500/10 p-4">
        <Shield className="h-12 w-12 text-emerald-500" />
      </div>
      <h1 className="mb-2 text-4xl font-bold tracking-tight">404</h1>
      <h2 className="mb-4 text-xl font-semibold">Page Not Found</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has been moved to a more secure location.
      </p>
      <Link
        href="/"
        className="rounded-md bg-emerald-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        Return to Vault
      </Link>
    </div>
  )
}
