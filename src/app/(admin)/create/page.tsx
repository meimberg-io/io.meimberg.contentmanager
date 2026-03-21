'use client'

import { useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { EditorKind } from '@/types'
import { splitEditorKind } from '@/lib/editor-kind'

const CreatePageEditor = dynamic(
  () => import('@/components/blocks/CreatePageEditor').then((m) => m.CreatePageEditor),
  { ssr: false, loading: () => <div className="min-h-[400px] animate-pulse rounded-lg bg-secondary/20" /> }
)

export default function CreatePostPage() {
  const router = useRouter()
  const editorRef = useRef<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editorKind, setEditorKind] = useState<EditorKind>('blog_long')
  const [title, setTitle] = useState('')

  const onEditorReady = useCallback((editor: Editor) => {
    editorRef.current = editor
  }, [])

  const createPost = async () => {
    const editor = editorRef.current
    let text = ''
    if (editor) {
      if (typeof editor.getMarkdown === 'function') {
        text = editor.getMarkdown().trim()
      }
      if (!text) {
        text = editor.getText({ blockSeparator: '\n' }).trim()
      }
    }

    const name = title.trim()
    if (!name) {
      toast({
        title: 'Title required',
        description: 'Enter a title for the story name and URL slug.',
        variant: 'destructive',
      })
      return
    }

    if (!text) {
      toast({
        title: 'No content',
        description: 'Enter some source material in the editor.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const date = new Date().toISOString().split('T')[0]
      const { contentType, blogBodyVariant } = splitEditorKind(editorKind)

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          pagetitle: name,
          date,
          source_raw: text,
          source_summarized: text,
          cm_origin: 'create',
          contentType,
          ...(contentType === 'blog' ? { blogBodyVariant } : {}),
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

      <div className="space-y-6 max-w-xl">
        <div className="space-y-2 max-w-xs">
          <Label className="text-sm text-muted-foreground">Content type</Label>
          <Select
            value={editorKind}
            onValueChange={(v) => setEditorKind(v as EditorKind)}
          >
            <SelectTrigger className="bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="article">Artikel (a/)</SelectItem>
              <SelectItem value="blog_short">Blog Short (b/)</SelectItem>
              <SelectItem value="blog_long">Blog Long (b/)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="create-title" className="text-sm text-muted-foreground">
            Title
          </Label>
          <Input
            id="create-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Colour tools for Tailwind CSS"
            className="bg-secondary/50"
            autoComplete="off"
          />
        </div>
      </div>

      <CreatePageEditor onEditorReady={onEditorReady} />

      <div className="flex items-center gap-3">
        <Button
          type="button"
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
