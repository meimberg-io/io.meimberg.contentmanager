/**
 * System Configuration Storage
 * Manages the config field in the contentmanager_config story in Storyblok
 */

const MANAGEMENT_API_BASE = 'https://mapi.storyblok.com/v1'
const SPACE_ID = process.env.STORYBLOK_SPACE_ID || '330326'
const MANAGEMENT_TOKEN = process.env.STORYBLOK_MANAGEMENT_TOKEN

const SYSTEM_STORY_SLUG = 'system'

// Cache story ID to avoid repeated lookups
let cachedStoryId: number | null = null

export interface SystemConfig {
  [key: string]: any
  settings?: any
}

/**
 * Get the system story ID (with caching)
 */
async function getSystemStoryId(): Promise<number | null> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  // Return cached ID if available
  if (cachedStoryId !== null) {
    return cachedStoryId
  }

  // Allow override via environment variable
  const envStoryId = process.env.STORYBLOK_SYSTEM_STORY_ID
  if (envStoryId) {
    const parsedId = parseInt(envStoryId, 10)
    if (!isNaN(parsedId)) {
      cachedStoryId = parsedId
      return parsedId
    }
  }

  // Try to find by slug "contentmanager_config"
  let response = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?with_slug=system/contentmanager_config`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    if (data.stories && data.stories.length > 0) {
      cachedStoryId = data.stories[0].id
      return cachedStoryId
    }
  }

  // Fallback: search by slug anywhere
  response = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories?by_slugs=*/contentmanager_config`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    const data = await response.json()
    if (data.stories && data.stories.length > 0) {
      cachedStoryId = data.stories[0].id
      return cachedStoryId
    }
  }

  return null
}

/**
 * Get the current system config
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  if (!MANAGEMENT_TOKEN) {
    return {}
  }

  try {
    const storyId = await getSystemStoryId()
    if (!storyId) {
      return {}
    }

    const response = await fetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
      {
        headers: {
          'Authorization': MANAGEMENT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      return {}
    }

    const data = await response.json()
    const content = data.story.content || {}
    const configString = content.config || '{}'

    if (!configString || configString.trim() === '') {
      return {}
    }

    try {
      return JSON.parse(configString)
    } catch (error) {
      console.error('Failed to parse system config:', error)
      return {}
    }
  } catch (error) {
    console.error('Failed to get system config:', error)
    return {}
  }
}

/**
 * Update the system config
 */
export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  if (!MANAGEMENT_TOKEN) {
    throw new Error('STORYBLOK_MANAGEMENT_TOKEN not configured')
  }

  const storyId = await getSystemStoryId()
  if (!storyId) {
    throw new Error('System story not found. Please create it in Storyblok with slug "system"')
  }

  let storyResponse = await fetch(
    `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}?version=published`,
    {
      headers: {
        'Authorization': MANAGEMENT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  )

  if (!storyResponse.ok && storyResponse.status === 404) {
    storyResponse = await fetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
      {
        headers: {
          'Authorization': MANAGEMENT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )
  }

  if (!storyResponse.ok) {
    throw new Error(`Failed to fetch system story (ID: ${storyId}): ${storyResponse.status} ${storyResponse.statusText}`)
  }

  const storyData = await storyResponse.json()
  const currentContent = storyData.story.content || {}
  const component = storyData.story.content?.component || 'contentmanager_config'
  
  const currentConfig: SystemConfig = (() => {
    const configString = currentContent.config || '{}'
    if (!configString || configString.trim() === '') return {}
    try {
      return JSON.parse(configString)
    } catch {
      return {}
    }
  })()

  const updatedConfig: SystemConfig = {
    ...currentConfig,
    ...updates
  }

  const configJsonString = JSON.stringify(updatedConfig)
  const updatePayload: any = {
    story: {
      content: {
        component,
        config: configJsonString
      }
    },
    publish: 1
  }
  
  if (currentContent._uid) {
    updatePayload.story.content._uid = currentContent._uid
  }
  
  let retries = 3
  let delay = 200
  
  while (retries > 0) {
    const response = await fetch(
      `${MANAGEMENT_API_BASE}/spaces/${SPACE_ID}/stories/${storyId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': MANAGEMENT_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      }
    )

    if (response.ok) {
      await new Promise(resolve => setTimeout(resolve, 100))
      return updatedConfig
    }

    const error = await response.json().catch(() => ({ error: response.statusText }))
    const errorMessage = error.error || response.statusText || 'Unknown error'
    
    if (errorMessage.includes('Rate limit') && retries > 1) {
      retries--
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2
      continue
    }

    throw new Error(`Failed to update system config: ${errorMessage}`)
  }

  throw new Error('Failed to update system config after retries')
}
