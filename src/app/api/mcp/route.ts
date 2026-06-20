import { z } from 'zod'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { createPost } from '@/lib/storyblok-management'
import { validateMcpToken } from '@/lib/mcp-tokens'
import { editorUrlForSlug, listPosts, getPost } from '@/lib/mcp-posts'

// node:crypto (validateMcpToken) + the management-token write path → Node runtime.
export const runtime = 'nodejs'

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'create_draft',
      {
        title: 'Create Draft',
        description:
          'Legt im meimberg.io Content Manager einen neuen Artikel-Draft als typlosen Intake an. ' +
          'Nur Titel + Rohtext — der Content-Typ (Blog/Artikel) wird später in der UI gewählt. ' +
          'Draft-only: nichts wird veröffentlicht.',
        inputSchema: {
          title: z.string().min(1).describe('Titel des Drafts (wird zum Story-Namen).'),
          raw_text: z
            .string()
            .min(1)
            .describe('Roher Quelltext/Material; landet in cm_source_raw und ist die Basis für die spätere KI-Generierung.'),
        },
      },
      async ({ title, raw_text }) => {
        const result = await createPost({
          name: title,
          cm_source_raw: raw_text,
          cm_source_summarized: '',
          cm_origin: 'mcp',
          cm_intake_pending: true,
          date: new Date().toISOString().split('T')[0],
        })

        const story = result.story
        const editorUrl = editorUrlForSlug(story.slug)
        const payload = {
          id: String(story.id),
          slug: story.slug,
          name: story.name,
          intake_pending: true,
          editorUrl,
        }

        return {
          content: [
            {
              type: 'text' as const,
              text:
                `Draft „${story.name}" als Intake angelegt (Content-Typ noch offen).\n` +
                `Editor: ${editorUrl}\n\n` +
                JSON.stringify(payload, null, 2),
            },
          ],
        }
      }
    )

    server.registerTool(
      'list_posts',
      {
        title: 'List Posts',
        description:
          'Listet alle Posts im meimberg.io Content Manager (Blog, Artikel und LinkedIn) — Drafts UND ' +
          'Veröffentlichte — je mit Content-Complete-, Publish- und Geplant-Status, Herkunft (origin) und ' +
          'editorUrl. Nützlich, um den Stand zu prüfen, Dubletten zu vermeiden und nach create_draft zu ' +
          'verifizieren. Rein lesend.',
        inputSchema: {
          types: z
            .array(z.enum(['blog', 'article', 'linkedin']))
            .optional()
            .describe('Optional: nur diese Content-Typen zurückgeben. Weglassen = alle.'),
          intake_pending: z
            .boolean()
            .optional()
            .describe('Optional: nur typlose MCP-Intakes (true) bzw. nur bereits getypte (false).'),
          published: z
            .boolean()
            .optional()
            .describe('Optional: nur veröffentlichte (true) bzw. nur unveröffentlichte (false) Posts.'),
        },
      },
      async ({ types, intake_pending, published }) => {
        const posts = await listPosts({ types, intake_pending, published })
        return {
          content: [
            {
              type: 'text' as const,
              text: `${posts.length} Post(s).\n\n` + JSON.stringify(posts, null, 2),
            },
          ],
        }
      }
    )

    server.registerTool(
      'get_post',
      {
        title: 'Get Post',
        description:
          'Liefert einen einzelnen Post (Blog, Artikel oder LinkedIn) mit allen Quell- und Content-Feldern, ' +
          'dem vollen rohen Body-Block-Array und dem Status. Adressierung per numerischer id ODER slug ' +
          '(mindestens eines erforderlich; id bevorzugt). Rein lesend.',
        inputSchema: {
          id: z
            .string()
            .optional()
            .describe('Numerische Storyblok-Story-id (aus list_posts / create_draft).'),
          slug: z.string().optional().describe('Story-Slug (Alternative zur id).'),
        },
      },
      async ({ id, slug }) => {
        if (!id && !slug) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Fehler: Bitte id oder slug angeben.' }],
          }
        }
        const post = await getPost({ id, slug })
        if (!post) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Kein Post gefunden für ${id ? `id=${id}` : `slug=${slug}`}.`,
              },
            ],
          }
        }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(post, null, 2) }],
        }
      }
    )
  },
  {
    serverInfo: { name: 'meimberg-contentmanager', version: '1.0.0' },
  },
  {
    basePath: '/api',
    disableSse: true,
    verboseLogs: false,
  }
)

/** Validate the presented bearer token against the managed MCP tokens (MICM-31). */
const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined
  const token = await validateMcpToken(bearerToken)
  if (!token) return undefined
  return {
    token: bearerToken,
    clientId: token.id,
    scopes: ['mcp:tools'],
    extra: { tokenName: token.name },
  }
}

const authHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authHandler as GET, authHandler as POST }
