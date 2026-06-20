/**
 * MCP bearer-token management (MICM-31).
 *
 * Tokens authenticate the MCP server (MICM-22). They are stored HASHED in the
 * app settings (contentmanager_config story); the plaintext is shown to the user
 * exactly once at creation and never persisted. Server-only — this module uses
 * node:crypto and the management-token settings path; never import it client-side.
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { getSettings, updateSettings, type McpToken } from './settings-storage'

const TOKEN_PREFIX = 'micm_'

/** Token entry without the secret hash — safe to send to the client. */
export interface McpTokenMasked {
  id: string
  name: string
  prefix: string
  createdAt: string
}

export interface CreatedMcpToken {
  token: McpTokenMasked
  /** Full plaintext — returned exactly once, never stored. */
  plaintext: string
}

function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex')
}

function mask(t: McpToken): McpTokenMasked {
  return { id: t.id, name: t.name, prefix: t.prefix, createdAt: t.createdAt }
}

/** All tokens, masked (no hashes). */
export async function listMcpTokens(): Promise<McpTokenMasked[]> {
  const settings = await getSettings()
  return (settings.mcpTokens ?? []).map(mask)
}

/**
 * Generate a new token, store its hash, and return the plaintext once.
 * Reads settings fresh so a token created moments ago isn't dropped.
 */
export async function createMcpToken(name: string): Promise<CreatedMcpToken> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Token-Name darf nicht leer sein')
  }

  const secret = randomBytes(32).toString('hex') // 64 hex chars, high entropy
  const plaintext = `${TOKEN_PREFIX}${secret}`
  const entry: McpToken = {
    id: randomUUID(),
    name: trimmed,
    tokenHash: hashToken(plaintext),
    prefix: `${TOKEN_PREFIX}${secret.slice(0, 6)}…`,
    createdAt: new Date().toISOString(),
  }

  const settings = await getSettings({ fresh: true })
  const tokens = settings.mcpTokens ?? []
  await updateSettings({ mcpTokens: [...tokens, entry] })

  return { token: mask(entry), plaintext }
}

/** Hard-delete a token by id. Throws if it doesn't exist. */
export async function revokeMcpToken(id: string): Promise<void> {
  const settings = await getSettings({ fresh: true })
  const tokens = settings.mcpTokens ?? []
  const next = tokens.filter((t) => t.id !== id)
  if (next.length === tokens.length) {
    throw new Error('Token nicht gefunden')
  }
  await updateSettings({ mcpTokens: next })
}

/**
 * Validate a presented bearer token against the stored hashes (constant-time).
 * Returns the matching (masked) token or null. Reads cached settings (30s TTL),
 * so a revoke takes effect within ≤30s — acceptable for this internal tool.
 *
 * This is the helper the MCP server (MICM-22) calls in its /api/mcp handler.
 */
export async function validateMcpToken(presented: string): Promise<McpTokenMasked | null> {
  if (!presented) return null
  const presentedBuf = Buffer.from(hashToken(presented), 'hex')
  const settings = await getSettings()
  for (const t of settings.mcpTokens ?? []) {
    const storedBuf = Buffer.from(t.tokenHash, 'hex')
    if (storedBuf.length === presentedBuf.length && timingSafeEqual(storedBuf, presentedBuf)) {
      return mask(t)
    }
  }
  return null
}
