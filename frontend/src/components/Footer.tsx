'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto bg-card/80 border-t border-border">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <a
            href="https://x.com/talos_is"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 group"
          >
            <span>Follow Talos on X</span>
            <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </a>
          
          <div className="hidden sm:block w-px h-4 bg-border"></div>
          
          <a
            href="https://github.com/talos-agent/aegis-transfer"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-200 group"
          >
            <span>View Aegis on GitHub</span>
            <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
          </a>
        </div>
      </div>
    </footer>
  )
}
