import { z } from 'zod'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { createPost } from '@/lib/storyblok-management'
import { validateMcpToken } from '@/lib/mcp-tokens'
import { editorUrlForSlug, listPosts, getPost, updatePostFromMcp } from '@/lib/mcp-posts'

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

    server.registerTool(
      'update_post',
      {
        title: 'Update Post',
        description:
          'Editiert einen bestehenden Post (Blog, Artikel oder LinkedIn) und speichert ihn zurück. ' +
          'Adressierung per id ODER slug. Nur übergebene Felder werden geändert (Merge) — alle anderen bleiben unangetastet. ' +
          'WICHTIG für Body-/Textänderungen: zuerst get_post aufrufen, den gelieferten Inhalt anpassen und das ' +
          'KOMPLETTE body-Block-Array zurückschicken — nur die betroffene Stelle ändern, Block-Struktur und _uid erhalten. ' +
          'Publish-Status bleibt erhalten: ein bereits veröffentlichter Blog/Artikel wird mit der Änderung sofort wieder ' +
          'veröffentlicht; ein Draft bleibt Draft (LinkedIn: immer Draft, kein Publer-Push). ' +
          'pagetitle/pageintro/abstract/teasertitle/readmoretext/body gelten nur für Blog/Artikel, linkedin_text/tags nur für LinkedIn.',
        inputSchema: {
          id: z.string().optional().describe('Numerische Storyblok-Story-id (aus list_posts / get_post). id bevorzugt.'),
          slug: z.string().optional().describe('Story-Slug (Alternative zur id).'),
          name: z.string().optional().describe('Story-Name/Titel (alle Typen).'),
          pagetitle: z.string().optional().describe('Blog/Artikel: Seitentitel.'),
          pageintro: z.string().optional().describe('Blog/Artikel: Intro-Text.'),
          abstract: z.string().optional().describe('Blog/Artikel: Abstract.'),
          teasertitle: z.string().optional().describe('Blog/Artikel: Teaser-Titel.'),
          readmoretext: z.string().optional().describe('Blog/Artikel: Read-more-Text.'),
          body: z
            .array(z.any())
            .optional()
            .describe('Blog/Artikel: komplettes rohes Storyblok-Body-Block-Array (vorher via get_post lesen und modifizieren).'),
          linkedin_text: z.string().optional().describe('LinkedIn: Post-Text.'),
          tags: z
            .array(z.string())
            .optional()
            .describe('LinkedIn: Tags (werden komma-separiert in cm_tags gespeichert).'),
        },
      },
      async (input) => {
        if (!input.id && !input.slug) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Fehler: Bitte id oder slug angeben.' }],
          }
        }
        try {
          const result = await updatePostFromMcp(input)
          const stateText =
            result.type === 'linkedin'
              ? 'als Draft gespeichert (LinkedIn — kein Publer-Push)'
              : result.republished
                ? 'gespeichert und wieder veröffentlicht (live)'
                : 'als Draft gespeichert'
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  `Post „${result.name}" ${stateText}.\n` +
                  `Editor: ${result.editorUrl}\n\n` +
                  JSON.stringify(result, null, 2),
              },
            ],
          }
        } catch (err) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: `Fehler beim Aktualisieren: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          }
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
