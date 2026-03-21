import type {
  BlogBodyVariant,
  EditorKind,
  PostContentType,
} from '@/types'

export function editorKindFromPost(p: {
  contentType: PostContentType
  blogBodyVariant?: BlogBodyVariant
}): EditorKind {
  if (p.contentType === 'article') return 'article'
  return p.blogBodyVariant === 'short' ? 'blog_short' : 'blog_long'
}

export function splitEditorKind(kind: EditorKind): {
  contentType: PostContentType
  blogBodyVariant?: BlogBodyVariant
} {
  switch (kind) {
    case 'article':
      return { contentType: 'article' }
    case 'blog_short':
      return { contentType: 'blog', blogBodyVariant: 'short' }
    default:
      return { contentType: 'blog', blogBodyVariant: 'long' }
  }
}
