'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Eye, X } from 'lucide-react';
import { getPreviewUrl, getViewUrl } from '@/lib/format';

interface FileViewerLinkProps {
  url: string;
  label: string;
  title?: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Opens a Drive file (image / PDF) in an in-app preview modal so it can be
 * viewed directly in the browser without downloading it.
 */
export function FileViewerLink({ url, label, title, className, showIcon = false }: FileViewerLinkProps) {
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'text-blue-600 hover:underline inline-flex items-center gap-2'}
      >
        {showIcon && <Eye className="w-4 h-4" />}
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60]"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border">
              <p className="font-semibold truncate">{title ?? label}</p>
              <div className="flex items-center gap-1">
                <a
                  href={getViewUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline px-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <iframe
              src={getPreviewUrl(url)}
              title={title ?? label}
              className="flex-1 w-full rounded-b-lg"
              allow="autoplay"
            />
          </div>
        </div>
      )}
    </>
  );
}
