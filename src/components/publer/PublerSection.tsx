"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Check, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Send
} from "lucide-react"
import { cn } from "@/lib/utils"

// Custom social media icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
  </svg>
)

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.108-1.152 3.457-1.187 1.357-.035 2.396.208 3.192.623-.002-.477-.042-.94-.127-1.386-.376-1.958-1.596-2.953-3.627-2.953-.952 0-1.754.26-2.322.754-.536.467-.86 1.105-.968 1.9l-2.074-.283c.167-1.236.702-2.253 1.593-3.026 1.004-.87 2.31-1.336 3.787-1.336 1.987 0 3.49.586 4.468 1.742.865 1.02 1.323 2.496 1.364 4.393.015.68-.011 1.385-.077 2.103.723.392 1.347.883 1.858 1.47 1.041 1.198 1.476 2.722 1.221 4.285-.306 1.869-1.455 3.478-3.235 4.527-1.592.94-3.57 1.441-5.717 1.45z"/>
    <path d="M11.849 16.059c-1.353.035-2.14.586-2.103 1.47.035.821.763 1.39 1.942 1.52 1.477.164 2.564-.43 2.88-1.642-.592-.354-1.423-.575-2.538-.606-.061-.001-.12-.001-.181.001v-.743z"/>
  </svg>
)

// Channel type
type PubChannel = 'instagram' | 'facebook' | 'pinterest' | 'twitter' | 'threads'

// Account from API
interface PubAccount {
  id: string
  platform: string
  name: string
  picture?: string
  defaultBoard?: string
}

// Channel config with icon and color
const CHANNEL_CONFIG: Record<PubChannel, { 
  label: string
  icon: React.ReactNode
  color: string
  maxHashtags: number
  hasLink: boolean
  linkLabel?: string
}> = {
  instagram: { 
    label: 'Instagram', 
    icon: <InstagramIcon className="h-3 w-3" />,
    color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    maxHashtags: 30,
    hasLink: true,
    linkLabel: 'Link in Bio'
  },
  facebook: { 
    label: 'Facebook', 
    icon: <FacebookIcon className="h-3 w-3" />,
    color: 'bg-[#1877F2]',
    maxHashtags: 10,
    hasLink: true
  },
  pinterest: { 
    label: 'Pinterest', 
    icon: <PinterestIcon className="h-3 w-3" />,
    color: 'bg-[#E60023]',
    maxHashtags: 5,
    hasLink: true,
    linkLabel: 'Destination URL'
  },
  twitter: { 
    label: 'X', 
    icon: <XIcon className="h-3 w-3" />,
    color: 'bg-black',
    maxHashtags: 3,
    hasLink: true
  },
  threads: { 
    label: 'Threads', 
    icon: <ThreadsIcon className="h-3 w-3" />,
    color: 'bg-black',
    maxHashtags: 1,
    hasLink: false
  }
}

interface PublerSectionProps {
  status: {
    completed: boolean
    timestamp?: string
    color: "green" | "yellow" | "red" | "gray"
  }
  storyId: string
  postTitle: string
  postCaption: string
  postTags: string[]
  imageUrl: string
  linkUrl?: string
  onStatusChange?: () => void
}

export function PublerSection({
  status,
  storyId,
  postTitle,
  postCaption,
  postTags,
  imageUrl,
  linkUrl,
  onStatusChange
}: PublerSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Accounts from Publer
  const [accounts, setAccounts] = useState<PubAccount[]>([])
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  
  // Selected channels
  const [selectedChannels, setSelectedChannels] = useState<Set<PubChannel>>(new Set())

  // Load accounts when expanded for the first time
  useEffect(() => {
    if (isExpanded && !hasLoadedOnce) {
      loadAccounts()
    }
  }, [isExpanded, hasLoadedOnce])

  async function loadAccounts() {
    setIsLoading(true)
    setError(null)
    
    try {
      const res = await fetch('/api/publishing/publer/accounts')
      
      // Check content type before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await res.text()
        console.error('Non-JSON response:', text.slice(0, 100))
        throw new Error('Server error - please try again')
      }
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load accounts')
      }
      
      setAccounts(data.accounts || [])
      
      // Auto-select all accounts
      const channels = new Set<PubChannel>()
      data.accounts?.forEach((acc: PubAccount) => {
        const platform = acc.platform?.toLowerCase() as PubChannel
        if (platform && CHANNEL_CONFIG[platform]) {
          channels.add(platform)
        }
      })
      setSelectedChannels(channels)
    } catch (err: any) {
      console.error('Failed to load Publer accounts:', err)
      setError(err.message || 'Failed to load accounts')
    } finally {
      setIsLoading(false)
      setHasLoadedOnce(true)
    }
  }

  function toggleChannel(channel: PubChannel) {
    setSelectedChannels(prev => {
      const next = new Set(prev)
      if (next.has(channel)) {
        next.delete(channel)
      } else {
        next.add(channel)
      }
      return next
    })
  }


  async function handlePublish() {
    if (selectedChannels.size === 0) {
      setError('Please select at least one channel')
      return
    }
    
    setIsPublishing(true)
    setError(null)
    
    try {
      const channels = Array.from(selectedChannels)
      
      const res = await fetch('/api/publishing/publer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          imageUrl,
          channels,
          title: postTitle,
          caption: postCaption,
          tags: postTags,
          linkUrl
        })
      })
      
      // Check content type
      const contentType = res.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        throw new Error('Server error - please try again')
      }
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish')
      }
      
      onStatusChange?.()
      setIsExpanded(false)
    } catch (err: any) {
      console.error('Failed to publish:', err)
      setError(err.message || 'Failed to publish')
    } finally {
      setIsPublishing(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not started"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const currentStatusColor = status.completed ? 'green' : 'gray'

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      currentStatusColor === 'green' ? "border-green-500/30 bg-green-500/5" : "border-border"
    )}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className={cn(
            "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
            currentStatusColor === 'green' && "bg-green-500",
            currentStatusColor === 'gray' && "bg-muted-foreground/30"
          )}>
            <Check className={cn(
              "h-4 w-4",
              currentStatusColor === 'gray' ? "text-muted-foreground/50" : "text-white"
            )} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Published to Publer</p>
                <p className="text-sm text-muted-foreground">
                  {status.completed ? formatDate(status.timestamp) : "Not started"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border p-4 pl-[52px] space-y-4">
          {(isLoading || !hasLoadedOnce) ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error && accounts.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={loadAccounts}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Channel Selection */}
              <div className="space-y-2">
                <Label className="font-medium">Channels</Label>
                <div className="rounded-lg bg-background border border-border p-2 space-y-0.5">
                  {(Object.keys(CHANNEL_CONFIG) as PubChannel[]).map(channel => {
                    const config = CHANNEL_CONFIG[channel]
                    const account = accounts.find(a => a.platform.toLowerCase() === channel)
                    const isSelected = selectedChannels.has(channel)
                    const isAvailable = !!account
                    
                    return (
                      <button
                        key={channel}
                        disabled={!isAvailable}
                        className={cn(
                          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-left transition-colors",
                          isAvailable 
                            ? isSelected 
                              ? "bg-muted" 
                              : "hover:bg-muted/50"
                            : "opacity-40 cursor-not-allowed"
                        )}
                        onClick={() => isAvailable && toggleChannel(channel)}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 text-primary shrink-0" />}
                        <div className={cn(
                          "h-5 w-5 rounded flex items-center justify-center text-white",
                          config.color
                        )}>
                          {config.icon}
                        </div>
                        <span className={cn(
                          isSelected ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {config.label}
                          {account && <span className="text-muted-foreground ml-1">({account.name})</span>}
                          {!isAvailable && <span className="text-muted-foreground ml-1">(not connected)</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {/* Publish Button */}
              <Button
                className="w-full gap-2"
                onClick={handlePublish}
                disabled={isPublishing || selectedChannels.size === 0}
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish to {selectedChannels.size} Channel{selectedChannels.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
