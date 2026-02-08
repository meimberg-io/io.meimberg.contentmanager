/**
 * Mail Inbox Integration via Microsoft Graph API
 * Uses OAuth2 Client Credentials to access a mailbox without user interaction.
 * Requires Azure AD app with Mail.Read + Mail.ReadWrite application permissions.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export interface EmailSummary {
  id: string
  uid: number // kept for compat, but we use Graph message id
  subject: string
  from: string
  date: string
  hasAttachments: boolean
  attachmentNames: string[]
  preview: string
}

export interface EmailWithAttachments {
  id: string
  uid: number
  subject: string
  from: string
  date: string
  body: string
  attachments: Array<{
    filename: string
    contentType: string
    content: string // Text content of the attachment
  }>
}

// ─── OAuth2 Token ─────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

function clearTokenCache() {
  cachedToken = null
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }

  const tenantId = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must be configured')
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${response.status} ${error}`)
  }

  const data = await response.json()

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }

  return cachedToken.token
}

function getMailboxUser(): string {
  const user = process.env.MAILINBOX_USERNAME
  if (!user) {
    throw new Error('MAILINBOX_USERNAME must be configured')
  }
  return user
}

// ─── Graph API helpers ────────────────────────────────────

async function graphGet(path: string, retry = true): Promise<any> {
  const token = await getAccessToken()
  const user = getMailboxUser()
  const url = `${GRAPH_BASE}/users/${user}${path}`

  console.log(`[Graph] GET ${url.replace(token, '***')}`)

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const error = await response.text()
    // If 403/401 and we have a cached token, clear cache and retry once
    if ((response.status === 403 || response.status === 401) && retry) {
      console.log('[Graph] Access denied, clearing token cache and retrying...')
      clearTokenCache()
      return graphGet(path, false)
    }
    throw new Error(`Graph API error: ${response.status} ${error}`)
  }

  return response.json()
}

async function graphDelete(path: string, retry = true): Promise<void> {
  const token = await getAccessToken()
  const user = getMailboxUser()
  const url = `${GRAPH_BASE}/users/${user}${path}`

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok && response.status !== 204) {
    const error = await response.text()
    if ((response.status === 403 || response.status === 401) && retry) {
      clearTokenCache()
      return graphDelete(path, false)
    }
    throw new Error(`Graph API delete error: ${response.status} ${error}`)
  }
}

// ─── Public API ───────────────────────────────────────────

/**
 * Fetch list of unread emails from inbox
 */
export async function fetchNewEmails(): Promise<EmailSummary[]> {
  // Fetch unread messages from Inbox, newest first
  const data = await graphGet(
    `/mailFolders/Inbox/messages?$filter=isRead eq false&$orderby=receivedDateTime desc&$top=50&$select=id,subject,from,receivedDateTime,hasAttachments,bodyPreview`
  )

  const messages = data.value || []

  // For messages with attachments, fetch attachment names
  const emails: EmailSummary[] = []
  for (const msg of messages) {
    let attachmentNames: string[] = []

    if (msg.hasAttachments) {
      try {
        const attData = await graphGet(
          `/messages/${msg.id}/attachments?$select=name,contentType`
        )
        attachmentNames = (attData.value || [])
          .filter((a: any) => a['@odata.type'] === '#microsoft.graph.fileAttachment')
          .map((a: any) => a.name || 'unnamed')
      } catch {
        // If attachment fetch fails, still include the email
      }
    }

    emails.push({
      id: msg.id,
      uid: 0, // Graph uses string IDs, not UIDs
      subject: msg.subject || '(No subject)',
      from: msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || 'Unknown',
      date: msg.receivedDateTime || new Date().toISOString(),
      hasAttachments: msg.hasAttachments || false,
      attachmentNames,
      preview: msg.bodyPreview || '',
    })
  }

  return emails
}

/**
 * Fetch a single email with its attachments' text content
 */
export async function fetchEmailWithAttachments(messageId: string): Promise<EmailWithAttachments> {
  // Fetch the message
  const msg = await graphGet(
    `/messages/${messageId}?$select=id,subject,from,receivedDateTime,body,hasAttachments`
  )

  // Fetch attachments
  const attachments: EmailWithAttachments['attachments'] = []

  if (msg.hasAttachments) {
    const attData = await graphGet(
      `/messages/${messageId}/attachments`
    )

    for (const att of (attData.value || [])) {
      if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue

      // Decode base64 content
      let textContent = ''
      if (att.contentBytes) {
        const buffer = Buffer.from(att.contentBytes, 'base64')
        textContent = buffer.toString('utf-8')
      }

      attachments.push({
        filename: att.name || 'unnamed',
        contentType: att.contentType || 'application/octet-stream',
        content: textContent,
      })
    }
  }

  // Extract plain text from body (Graph returns HTML by default)
  const bodyText = msg.body?.contentType === 'text'
    ? msg.body.content
    : stripHtml(msg.body?.content || '')

  return {
    id: msg.id,
    uid: 0,
    subject: msg.subject || '(No subject)',
    from: msg.from?.emailAddress?.address || msg.from?.emailAddress?.name || 'Unknown',
    date: msg.receivedDateTime || new Date().toISOString(),
    body: bodyText,
    attachments,
  }
}

/**
 * Delete an email after successful import
 */
export async function deleteEmail(messageId: string): Promise<void> {
  await graphDelete(`/messages/${messageId}`)
}

/**
 * Mark an email as read (fallback if delete is not desired)
 */
export async function markAsProcessed(messageId: string): Promise<void> {
  const token = await getAccessToken()
  const user = getMailboxUser()

  const response = await fetch(
    `${GRAPH_BASE}/users/${user}/messages/${messageId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isRead: true }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to mark as read: ${response.status} ${error}`)
  }
}

// ─── Helpers ──────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
