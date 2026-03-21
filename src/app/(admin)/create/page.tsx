'use client'

import { useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlusCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { Editor } from '@tiptap/react'

const CreatePageEditor = dynamic(
  () => import('@/components/blocks/CreatePageEditor').then((m) => m.CreatePageEditor),
  { ssr: false, loading: () => <div className="min-h-[400px] animate-pulse rounded-lg bg-secondary/20" /> }
)

export default function CreatePostPage() {
  const router = useRouter()
  const editorRef = useRef<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [contentType, setContentType] = useState<'blog' | 'article'>('blog')

  const onEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const createPost = async () => {
    const editor = editorRef.current
    const text = (editor && typeof editor.getMarkdown === 'function' ? editor.getMarkdown() : '').trim()

    if (!text) {
      toast({
        title: 'No content',
        description: 'Enter some content to create a post.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim()
      const name = firstLine || `New Post ${new Date().toISOString().split('T')[0]}`
      const date = new Date().toISOString().split('T')[0]

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          source_raw: text,
          source_summarized: text,
          cm_origin: 'create',
          contentType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      const slug = data?.story?.slug
      if (slug) {
        toast({
          title: 'Post created',
          description: 'Open the post to generate content with AI.',
        })
        router.push(`/posts/${slug}`)
      } else {
        toast({
          title: 'Post created',
          description: 'Open All Posts to find and edit it.',
        })
        router.push('/posts')
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create post',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Create new post</h1>
        <p className="text-muted-foreground mt-1">
          Write your source material in the editor. It will be stored as Quellmaterial so you can use the same AI tools as with imported posts.
        </p>
      </div>

      <div className="space-y-2 max-w-xs">
        <Label className="text-sm text-muted-foreground">Content type</Label>
        <Select
          value={contentType}
          onValueChange={(v) => setContentType(v === 'article' ? 'article' : 'blog')}
        >
          <SelectTrigger className="bg-secondary/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blog">Blog (b/)</SelectItem>
            <SelectItem value="article">Article (a/)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CreatePageEditor onEditorReady={onEditorReady} />

      <div className="flex items-center gap-3">
        <Button
          onClick={createPost}
          disabled={submitting}
          className="gap-2"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {submitting ? 'Creating…' : 'Create post'}
        </Button>
        <Link href="/dashboard">
          <Button variant="ghost">Cancel</Button>
        </Link>
      </div>
    </div>
  )
}
