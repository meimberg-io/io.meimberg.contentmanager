#!/usr/bin/env node
/**
 * Refactor News: extend newsfeedlist component, create p/news page, unpublish old news.
 * Run from contentmanager root with STORYBLOK_MANAGEMENT_TOKEN and STORYBLOK_SPACE_ID set
 * (e.g. from .env: set -a && source .env && set +a && node scripts/refactor-news-to-page.mjs).
 */
const SPACE_ID = process.env.STORYBLOK_SPACE_ID || '330326'
const TOKEN = process.env.STORYBLOK_MANAGEMENT_TOKEN
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`

if (!TOKEN) {
  console.error('STORYBLOK_MANAGEMENT_TOKEN is required')
  process.exit(1)
}

const auth = { Authorization: TOKEN }
const json = { ...auth, 'Content-Type': 'application/json' }

async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: body ? json : auth }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function main() {
  console.log('1. Fetching components...')
  const compList = await api('/components')
  const newsfeedlist = compList.components?.find((c) => c.name === 'newsfeedlist')
  if (!newsfeedlist) {
    throw new Error('Component newsfeedlist not found')
  }

  console.log('2. Updating newsfeedlist schema (limit, pagesize, variant)...')
  const full = await api(`/components/${newsfeedlist.id}`)
  const comp = full.component
  const schema = comp.schema || {}
  const positions = Object.values(schema).map((f) => f.pos).filter(Number.isFinite)
  const nextPos = positions.length ? Math.max(...positions) + 1 : 0

  schema.limit = {
    type: 'text',
    pos: nextPos,
    display_name: 'Limit',
    description: 'Max number of items (empty = all). Used in compact variant.',
  }
  schema.pagesize = {
    type: 'text',
    pos: nextPos + 1,
    display_name: 'Page size',
    description: 'If set, enable pagination (e.g. 20 for News page).',
  }
  schema.variant = {
    type: 'option',
    pos: nextPos + 2,
    display_name: 'Variant',
    default_value: 'full',
    options: [
      { _uid: uid(), name: 'Compact (Startseite)', value: 'compact' },
      { _uid: uid(), name: 'Full (News-Seite)', value: 'full' },
    ],
  }

  await api(`/components/${comp.id}`, {
    method: 'PUT',
    body: { component: { ...comp, schema } },
  })
  console.log('   Schema updated.')

  console.log('3. Fetching current news story...')
  const listRes = await api('/stories?filter_query[component][in]=news&per_page=1')
  const oldNews = listRes.stories?.[0]
  if (!oldNews) {
    console.log('   No existing news story found; skipping migration of feeds.')
  }

  console.log('4. Resolving folder p...')
  const folderRes = await api('/stories?with_slug=p&is_folder=true&per_page=1')
  let folderId = folderRes.stories?.[0]?.id
  if (!folderId) {
    const createFolder = await api('/stories', {
      method: 'POST',
      body: {
        story: {
          name: 'p',
          slug: 'p',
          is_folder: true,
        },
      },
    })
    folderId = createFolder.story.id
    console.log('   Created folder p.')
  }

  console.log('5. Creating story p/news (page with newsfeedlist in body)...')
  const feeds = oldNews?.content?.feeds ?? []
  const newsfeedlistBlock = {
    _uid: uid(),
    component: 'newsfeedlist',
    feeds,
    variant: 'full',
    pagesize: '20',
    limit: '',
  }
  const pageContent = {
    component: 'page',
    pagetitle: oldNews?.content?.pagetitle ?? 'News',
    pageintro: oldNews?.content?.pageintro ?? '',
    layout: 'wide',
    body: [newsfeedlistBlock],
  }

  const createRes = await api('/stories', {
    method: 'POST',
    body: {
      story: {
        name: 'News',
        slug: 'news',
        parent_id: folderId,
        content: pageContent,
      },
      publish: 1,
    },
  })
  console.log('   Created and published p/news.')

  if (oldNews) {
    console.log('6. Unpublishing old news story...')
    await api(`/stories/${oldNews.id}/unpublish`, { method: 'GET' })
    console.log('   Unpublished.')
  }

  console.log('\nDone. News page is now at slug p/news (page + newsfeedlist in body).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
