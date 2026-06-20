import { z } from 'zod'
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import { createPost } from '@/lib/storyblok-management'
import { validateMcpToken } from '@/lib/mcp-tokens'

// node:crypto (validateMcpToken) + the management-token write path → Node runtime.
export const runtime = 'nodejs'

/** Base URL for the editor deep link (falls back to a relative path). */
function editorBase(): string {
  return (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/+$/, '')
}

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
        const base = editorBase()
        const editorUrl = base ? `${base}/posts/${story.slug}` : `/posts/${story.slug}`
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
