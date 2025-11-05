'use client'

import { RedirectsList } from '@/components/settings/redirects-list'

export default function RedirectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Post Redirects</h1>
        <p className="text-muted-foreground mt-2">
          Manage redirects for posts. Use post-to-post redirects for content consolidation or post-to-URL redirects for external content.
        </p>
      </div>
      <RedirectsList />
    </div>
  )
}