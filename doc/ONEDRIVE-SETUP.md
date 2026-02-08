# OneDrive Integration Setup Guide

Complete guide for configuring Microsoft OneDrive integration for image imports in Luxarise Admin.

## Overview

The OneDrive integration allows you to:
- Browse images from a specific OneDrive folder
- Import images directly into Storyblok catalog
- Automatically process images (thumbnails, watermarks)
- **Optionally delete imported files from OneDrive** to free up storage

## Architecture

```
User's OneDrive
    └── /Luxarise/ArtImages/
            ├── painting1.jpg
            ├── painting2.png
            └── photo3.webp
                    ↓
            OAuth 2.0 Authentication
                    ↓
            Microsoft Graph API
                    ↓
        Luxarise Admin (Next.js)
                    ↓
        ┌──────────┬──────────┬──────────┐
        ↓          ↓          ↓          ↓
    Download   Process   Upload   Delete (optional)
        ↓          ↓          ↓          ↓
    Original   Thumbnail  Storyblok  OneDrive
    Image      +Watermark  Assets     Cleanup
```

## Prerequisites

- Microsoft account (personal or organizational)
- Azure Portal access
- OneDrive folder created: `/Luxarise/ArtImages`

## Step 1: Create Azure App Registration

### 1.1 Navigate to Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Sign in with your Microsoft account
3. Search for **"App registrations"** in the top search bar
4. Click **"+ New registration"**

### 1.2 Configure Application

Fill in the registration form:

**Name:**
```
Luxarise Admin OneDrive
```

**Supported account types:**
- ✅ Select: "Accounts in any organizational directory and personal Microsoft accounts (Multitenant + Personal)"

**Redirect URI:**
- Platform: **Web**
- URI: `http://localhost:3000/api/onedrive/callback`

Click **"Register"**

### 1.3 Copy Application IDs

After registration, you'll see the application overview page.

**Copy these values to your `.env.local`:**

1. **Application (client) ID**
   ```env
   ONEDRIVE_CLIENT_ID=12345678-1234-1234-1234-123456789abc
   ```

2. **Directory (tenant) ID**
   ```env
   ONEDRIVE_TENANT_ID=common
   ```
   
   > **Note**: Use `common` for personal Microsoft accounts. Use your specific tenant ID if using an organizational account.

## Step 2: Create Client Secret

### 2.1 Generate Secret

1. In your app registration, click **"Certificates & secrets"** (left sidebar)
2. Under **"Client secrets"**, click **"+ New client secret"**
3. Configure:
   - **Description**: `Luxarise Admin Secret`
   - **Expires**: 24 months (or as required by your policy)
4. Click **"Add"**

### 2.2 Copy Secret Value

⚠️  **CRITICAL**: The secret value is shown only ONCE!

1. **Immediately copy the "Value"** (not the "Secret ID")
2. Add to your `.env.local`:
   ```env
   ONEDRIVE_CLIENT_SECRET=abc123DEF456ghi789JKL012mno345PQR678stu
   ```

3. ⚠️  **If you miss this step**, you must delete the secret and create a new one!

## Step 3: Configure API Permissions

### 3.1 Add Microsoft Graph Permissions

1. In your app registration, click **"API permissions"** (left sidebar)
2. Click **"+ Add a permission"**
3. Select **"Microsoft Graph"**
4. Select **"Delegated permissions"** (not Application permissions)

### 3.2 Select Required Permissions

Add these 4 permissions:

1. **Files.Read**
   - ✅ Check: `Files.Read`
   - Description: "Read user files"

2. **Files.Read.All**
   - ✅ Check: `Files.Read.All`
   - Description: "Read all files that user can access"

3. **Files.ReadWrite** (Required for delete feature)
   - ✅ Check: `Files.ReadWrite`
   - Description: "Have full access to user files"
   - Note: Needed to delete files after import

4. **offline_access**
   - ✅ Check: `offline_access`
   - Description: "Maintain access to data you have given it access to"

Click **"Add permissions"**

### 3.3 Grant Admin Consent (Optional)

If you're an administrator:
1. Click **"Grant admin consent for [Your Organization]"**
2. Confirm

> **Note**: If you're not an admin, users will be asked to consent when they first authenticate.

## Step 4: Add Production Redirect URI

When deploying to production, add the production callback URL:

1. Navigate to **"Authentication"** (left sidebar)
2. Under **"Platform configurations"** → **"Web"** → **"Redirect URIs"**
3. Click **"Add URI"**
4. Enter: `https://luxarise-admin.meimberg.io/api/onedrive/callback`
5. Click **"Save"**

**Your redirect URIs should be:**
- ✅ `http://localhost:3000/api/onedrive/callback` (Development)
- ✅ `https://luxarise-admin.meimberg.io/api/onedrive/callback` (Production)

## Step 5: Configure OneDrive Folder

### 5.1 Create Import Folder

1. Open [OneDrive](https://onedrive.live.com)
2. Create folder structure:
   ```
   /Luxarise/
   └── ArtImages/
   ```

3. Add to your `.env.local`:
   ```env
   ONEDRIVE_IMAGES_FOLDER=/Luxarise/ArtImages
   ```

### 5.2 Supported File Types

The system will import these image formats:
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

Other files in the folder will be ignored.

## Step 6: Complete Environment Configuration

### 6.1 Verify `.env.local`

Your `.env.local` should contain:

```env
#===========================================
# OneDrive Integration
#===========================================
ONEDRIVE_CLIENT_ID=<your-application-client-id>
ONEDRIVE_CLIENT_SECRET=<your-client-secret-value>
ONEDRIVE_TENANT_ID=common
ONEDRIVE_IMAGES_FOLDER=/Luxarise/ArtImages
```

### 6.2 Restart Development Server

⚠️  **Important**: Environment variables are loaded at startup!

```bash
# Stop current dev server (Ctrl+C)

# Restart to load new environment variables
npm run dev
```

## Step 7: Test the Integration

### 7.1 Upload Test Images

1. Go to your OneDrive folder: `/Luxarise/ArtImages/`
2. Upload 2-3 test images (JPEG or PNG)
3. Verify they appear in the folder

### 7.2 Test Import Flow

1. Open Luxarise Admin: http://localhost:3000
2. Login with Google OAuth
3. Navigate to **"Import Images"** page
4. Click **"Connect OneDrive"**
5. Authorize the app (consent screen will appear first time)
6. Verify test images appear in the list
7. Select images to import
8. Configure options:
   - Name prefix (optional)
   - ✅ Delete from OneDrive after import (recommended)
9. Click **"Import Selected Images"**
10. Watch progress and verify success

### 7.3 Verify Results

After import:
- ✅ Check Dashboard for new images
- ✅ Check Images page for imported entries
- ✅ Check Storyblok space for new `luxarise_picture` stories
- ✅ If delete option was enabled: Verify files removed from OneDrive

## Usage Guide

### Import Workflow

1. **Prepare Images**:
   - Upload images to OneDrive folder
   - Organize/rename as needed

2. **Import to Luxarise**:
   - Open Import page
   - Authenticate with OneDrive
   - Select images
   - Configure options
   - Import

3. **Processing** (automatic):
   - Downloads original image
   - Generates thumbnail (1200px max width/height)
   - Adds watermark to thumbnail
   - Uploads original + thumbnail to Storyblok assets
   - Creates catalog entry
   - **Deletes from OneDrive** (if enabled)

4. **Post-Import**:
   - Enrich content with AI
   - Review and edit metadata
   - Publish to channels

### Delete After Import Feature

**Recommended: Keep enabled** ✅

**Why?**
- Frees up OneDrive storage
- Prevents duplicate imports
- Automatic cleanup workflow
- Images are safely stored in Storyblok

**Safety:**
- Files are deleted ONLY after successful import
- If import fails, files remain in OneDrive
- Deletion failures don't abort import (logged only)
- You can always re-upload to OneDrive if needed

**When to disable:**
- Testing/debugging imports
- Want to keep OneDrive as backup
- Shared folder with other users

## Troubleshooting

### Error: "The OAuth client was not found"

**Cause**: Invalid `ONEDRIVE_CLIENT_ID`

**Solution**:
1. Verify client ID in Azure Portal → App registrations
2. Ensure no extra spaces in `.env.local`
3. Restart dev server

---

### Error: "invalid_client" or "Invalid client secret"

**Cause**: Invalid or expired `ONEDRIVE_CLIENT_SECRET`

**Solution**:
1. Generate new client secret in Azure Portal
2. Copy the **Value** (not Secret ID)
3. Update `.env.local`
4. Restart dev server

---

### Error: "redirect_uri_mismatch"

**Cause**: Redirect URI not configured in Azure

**Solution**:
1. Check Azure Portal → Authentication → Redirect URIs
2. Ensure exact match: `http://localhost:3000/api/onedrive/callback`
3. No trailing slash
4. Correct protocol (http vs https)

---

### Error: "Insufficient permissions"

**Cause**: Missing API permissions or consent

**Solution**:
1. Verify permissions in Azure Portal → API permissions
2. Ensure all 4 permissions are added:
   - Files.Read
   - Files.Read.All
   - Files.ReadWrite (for delete feature)
   - offline_access
3. Try granting admin consent
4. Re-authenticate in app

---

### No images showing in import list

**Possible causes:**

1. **Wrong folder path**:
   - Verify `ONEDRIVE_IMAGES_FOLDER=/Luxarise/ArtImages`
   - Check folder exists in OneDrive
   - Folder name is case-sensitive

2. **No supported files**:
   - Only .jpg, .jpeg, .png, .webp are supported
   - Check file extensions

3. **Access token expired**:
   - Re-authenticate with OneDrive

---

### Import fails but files still get deleted

**This should NOT happen!** The code deletes files only AFTER successful import.

**If it does happen:**
1. Check terminal logs for errors
2. Report bug with logs
3. Disable "Delete after import" until fixed

---

### Files not being deleted after import

**Possible causes:**

1. **Delete option disabled**: Check checkbox in UI
2. **API permission missing**: Verify `Files.ReadWrite` permission is added in Azure Portal
3. **Deletion fails silently**: Check server logs (terminal output)

**Solution:**
1. Verify `Files.ReadWrite` permission exists in Azure Portal → API permissions
2. If missing, add it and grant consent
3. Re-authenticate in app (logout and login again)
4. Check terminal for deletion errors

## Security Considerations

### Token Security

- ✅ OAuth tokens are temporary and user-specific
- ✅ Tokens stored in user's browser session only
- ✅ All API routes protected by `requireAuth()`
- ✅ No tokens stored in database

### File Access

- Users can only access their own OneDrive files
- No cross-user file access possible
- Admin whitelist controls who can use import feature

### Client Secret Protection

⚠️  **Keep client secret secure!**

- Never commit to Git (`.env.local` is in `.gitignore`)
- Never expose in browser
- Store in GitHub Secrets for production
- Rotate periodically (every 12-24 months)

## Production Deployment

### GitHub Secrets

Add these secrets to GitHub repository:

1. Go to Repository → Settings → Secrets → Actions
2. Add secrets:
   - `ONEDRIVE_CLIENT_ID`
   - `ONEDRIVE_CLIENT_SECRET`
   - `ONEDRIVE_TENANT_ID`
3. Add variable:
   - `ONEDRIVE_IMAGES_FOLDER` = `/Luxarise/ArtImages`

### Production Testing

After deployment:
1. Visit: https://luxarise-admin.meimberg.io/import
2. Test full import workflow
3. Verify OAuth redirect works with production URL
4. Check file deletion works in production

## API Reference

### Endpoints

**Start OAuth Flow**
```
GET /api/onedrive/auth
Response: { authUrl: "https://login.microsoftonline.com/..." }
```

**OAuth Callback** (automatic)
```
GET /api/onedrive/callback?code=xxx
Redirects to: /import?access_token=xxx
```

**List Files**
```
GET /api/onedrive/files?accessToken=xxx
Response: { files: [...] }
```

**Import Files**
```
POST /api/onedrive/import
Body: {
  files: OneDriveFile[],
  accessToken: string,
  namePrefix?: string,
  deleteAfterImport?: boolean  // default: false
}
Response: {
  success: true,
  imported: 5,
  failed: 0,
  results: [...],
  errors: []
}
```

**Delete File**
```
DELETE https://graph.microsoft.com/v1.0/me/drive/items/{fileId}
```

### Library Functions

See `src/lib/onedrive.ts`:

```typescript
import {
  getOneDriveAuthUrl,
  getOneDriveAccessToken,
  listImagesInFolder,
  importImageFromOneDrive,
  deleteOneDriveFile
} from '@/lib/onedrive'
```

## Support

### Resources

- [Microsoft Graph API Docs](https://docs.microsoft.com/en-us/graph/api/overview)
- [OneDrive API Reference](https://docs.microsoft.com/en-us/graph/api/resources/onedrive)
- [Azure App Registration](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

### Common Links

- Azure Portal: https://portal.azure.com
- OneDrive: https://onedrive.live.com
- Microsoft Graph Explorer: https://developer.microsoft.com/en-us/graph/graph-explorer

---

**Last Updated**: 2026-01-25
