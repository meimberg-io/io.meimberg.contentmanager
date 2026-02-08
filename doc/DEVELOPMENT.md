# Development Guide

Complete guide for developing the Luxarise Admin application.

## Project Structure

```
com.luxarise.admin.frontend/
├── .github/workflows/     # CI/CD pipelines
│   └── deploy.yml        # Automated deployment
├── doc/                  # Documentation
├── doc/requirements/     # Requirements and concepts
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (admin)/     # Protected admin routes
│   │   │   ├── dashboard/
│   │   │   ├── images/
│   │   │   ├── import/
│   │   │   └── settings/
│   │   ├── (auth)/      # Authentication routes
│   │   │   └── login/
│   │   ├── api/         # API routes
│   │   │   ├── auth/    # NextAuth
│   │   │   ├── images/  # Image CRUD
│   │   │   ├── ai/      # AI generation
│   │   │   └── publishing/ # Publishing endpoints
│   │   ├── globals.css  # Global styles (Luxarise theme)
│   │   └── layout.tsx   # Root layout
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── dashboard/   # Dashboard components
│   │   ├── images/      # Image components
│   │   └── layout/      # Layout components (AppLayout, NavLink)
│   ├── lib/
│   │   ├── storyblok.ts # Read-only Storyblok client
│   │   ├── storyblok-management.ts # Write Storyblok client (server-only!)
│   │   ├── auth-guard.ts # Authentication middleware
│   │   ├── openai.ts    # OpenAI integration
│   │   ├── onedrive.ts  # OneDrive integration
│   │   ├── image-processing.ts # Sharp image processing
│   │   └── utils.ts     # Utility functions
│   ├── types/           # TypeScript types
│   ├── data/            # Mock data (temporary)
│   └── hooks/           # React hooks
├── Dockerfile           # Production container
├── docker-compose.yml   # Development & production
├── docker-compose.prod.yml # Production template
├── next.config.ts       # Next.js configuration
├── tailwind.config.ts   # Tailwind with Luxarise theme
└── package.json         # Dependencies
```

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Luxarise theme
- **UI Components**: Radix UI + shadcn/ui
- **Authentication**: NextAuth v5 with Google OAuth
- **CMS**: Storyblok (existing space 330326)
- **Image Processing**: Sharp
- **AI**: OpenAI GPT-4 Vision
- **State**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation

## Development Workflow

### 1. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### 2. File Organization

**Route Groups** (organize without affecting URL):
- `(auth)` - Authentication pages (login)
- `(admin)` - Protected admin pages (dashboard, images, etc.)

**API Routes** (server-side):
- `api/auth/[...nextauth]` - NextAuth endpoints
- `api/images` - Image CRUD operations
- `api/ai/generate` - AI content generation
- `api/publishing/*` - Publishing endpoints

**Client vs Server Components:**
- Pages with interactivity (useState, onClick): `"use client"`
- Layout components without state: Server component (default)
- All API routes: Server-side by default

### 3. Adding New Features

**Add a new page:**

```bash
mkdir src/app/(admin)/my-feature
# Create page.tsx with "use client" if interactive
```

**Add a protected API route:**

```typescript
// src/app/api/my-endpoint/route.ts
import { requireAuth } from '@/lib/auth-guard'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // ALWAYS check auth first for write operations
  try {
    await requireAuth()
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }
  
  // Your logic here...
}
```

### 4. Storyblok Integration

**Read operations** (use in client or server):

```typescript
import { fetchLuxarisePictures, fetchSinglePicture } from '@/lib/storyblok'

// Fetch all images
const data = await fetchLuxarisePictures({ page: 1, perPage: 20 })

// Fetch single image
const image = await fetchSinglePicture('image-slug')
```

**Write operations** (server-side API routes ONLY):

```typescript
import { createPicture, updatePicture, uploadAsset } from '@/lib/storyblok-management'

// Create new picture
const result = await createPicture({
  name: 'My Artwork',
  title: 'Beautiful Art',
  abstract: 'A stunning piece',
  // ...
})

// Update existing
await updatePicture('story-id', {
  content_complete: true,
  gelato: true
})
```

### 5. Pull Storyblok Schema Changes

When content types are updated in Storyblok UI:

```bash
# Pull component definitions
npm run pull-sb-components

# Generate TypeScript types
npm run generate-sb-types
```

This creates/updates:
- `.storyblok/components/330326/components.json`
- `src/types/component-types-sb.d.ts`

### 6. Working with Images

**Upload and process:**

```typescript
import { createThumbnailWithWatermark, validateImage } from '@/lib/image-processing'

// Validate
const validation = await validateImage(buffer)
if (!validation.valid) {
  throw new Error(validation.error)
}

// Create thumbnail with watermark
const thumbnail = await createThumbnailWithWatermark(originalBuffer, {
  text: 'Luxarise',
  opacity: 30,
  position: 'center',
  fontSize: 100
})

// Upload to Storyblok
import { uploadAsset } from '@/lib/storyblok-management'
const asset = await uploadAsset(thumbnail, 'thumb_artwork.jpg')
```

### 7. AI Content Generation

```typescript
import { generateAllContent } from '@/lib/openai'

const content = await generateAllContent(imageUrl, {
  title: 'Custom title prompt...',
  caption: 'Custom caption prompt...',
  tags: 'Custom tags prompt...'
})

// Returns: { title, caption, tags }
```

### OneDrive Integration

Import images from OneDrive (Microsoft Graph API) to Storyblok.

**Configuration:**
```env
ONEDRIVE_CLIENT_ID=<azure-app-client-id>
ONEDRIVE_CLIENT_SECRET=<azure-app-secret>
ONEDRIVE_TENANT_ID=common  # or your tenant ID
ONEDRIVE_IMAGES_FOLDER=/Luxarise/ArtImages
```

**Import Workflow:**

1. **User Authentication**: OAuth 2.0 flow with Microsoft Graph API
2. **List Images**: Browse OneDrive folder for image files (jpg, png, webp)
3. **Select & Configure**:
   - Select which images to import
   - Optional: Add name prefix (e.g., "Painting_")
   - Toggle: Delete from OneDrive after import (default: enabled)
4. **Processing**:
   - Download original image from OneDrive
   - Generate thumbnail with watermark
   - Upload both to Storyblok assets
   - Create `luxarise_picture` story
   - **If enabled**: Delete file from OneDrive
5. **Result**: Images are now in catalog, ready for enrichment

**API Endpoints:**
- `GET /api/onedrive/auth` - Start OAuth flow
- `GET /api/onedrive/callback` - Handle OAuth redirect
- `GET /api/onedrive/files?accessToken=xxx` - List images
- `POST /api/onedrive/import` - Import selected images

**Library Functions:**
```typescript
import { 
  getOneDriveAuthUrl,
  getOneDriveAccessToken,
  listImagesInFolder,
  importImageFromOneDrive,
  deleteOneDriveFile
} from '@/lib/onedrive'

// Start OAuth
const authUrl = getOneDriveAuthUrl(redirectUri)

// Exchange code for token
const token = await getOneDriveAccessToken(code, redirectUri)

// List images
const files = await listImagesInFolder(token)

// Import with options
await importImageFromOneDrive(file, token, {
  namePrefix: 'Painting_',
  deleteAfterImport: true  // Delete from OneDrive after success
})

// Manual deletion
await deleteOneDriveFile(fileId, token)
```

**Security Notes:**
- OAuth tokens are user-specific and temporary
- All API routes protected by `requireAuth()`
- Files are deleted ONLY after successful import to Storyblok
- Deletion failures don't abort import (logged only)

## Testing

### Manual Testing

1. **Authentication Flow**:
   - Try logging in with whitelisted email (oli@meimberg.io)
   - Try logging in with non-whitelisted email (should fail)
   - Verify session persists across page reloads

2. **Image Management**:
   - View all images page
   - Test filters and search
   - View image detail
   - Test content enrichment

3. **API Protection**:
   - Try accessing `/api/images` without auth (should return 401)
   - Try with valid session (should work)

### Testing with Docker

```bash
# Build and run
docker compose --profile dev up --build

# Test in another terminal
curl -I http://localhost:3000
```

## Code Style

### TypeScript

- Use strict mode
- Define interfaces for all data structures
- Avoid `any` - use proper types

### React

- Use functional components
- Use hooks for state management
- Client components: Add `"use client"` directive
- Server components: Default (no directive needed)

### Tailwind CSS

- Use Luxarise design tokens (from globals.css)
- Custom classes: `.stat-card`, `.glass-card`, `.image-card`
- Status colors: `text-status-green`, `bg-status-yellow`, etc.
- Animations: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`

### File Naming

- Components: PascalCase (e.g., `ImageCard.tsx`)
- Utilities: camelCase (e.g., `image-processing.ts`)
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)

## Environment Variables

### Understanding Next.js Env Vars

**`NEXT_PUBLIC_*` variables:**
- Exposed to the browser
- Available in client components
- Baked into bundle at build time
- Use ONLY for non-sensitive, read-only data

**Regular variables:**
- Server-side only
- Not accessible in browser
- Use for API keys, secrets, write tokens

### Critical Security Rule

⚠️  **NEVER expose write tokens to browser**

```typescript
// ❌ WRONG - Exposes write token to browser
const token = process.env.NEXT_PUBLIC_STORYBLOK_MANAGEMENT_TOKEN

// ✅ CORRECT - Token stays on server
// In API route only:
const token = process.env.STORYBLOK_MANAGEMENT_TOKEN
```

## Debugging

### View Server Logs

```bash
# Local development
# Check terminal where `npm run dev` is running

# Docker
docker compose logs -f

# Production
ssh deploy@hc-02.meimberg.io "docker logs luxarise-admin -f"
```

### Common Debug Points

- Check `.env.local` file exists and has all vars
- Check Google OAuth redirect URI matches exactly
- Check whitelist email matches login email
- Check Storyblok space ID (330326)
- Check API route protection with `requireAuth()`

## Performance

- Images are lazy-loaded
- Use Next.js Image component for optimization
- Storyblok responses can be cached (control with `DISABLECACHING`)
- React Query handles client-side caching

## Related Documentation

- [SETUP-CHECKLIST.md](SETUP-CHECKLIST.md) - Setup guide
- [DOCKER-COMPOSE.md](DOCKER-COMPOSE.md) - Docker usage
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [Frontend Concept](requirements/frontend_concept.md) - UI spec
