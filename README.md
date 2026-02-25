# Artwork Snake

A small snake game that uses images for the snake body. Open `index.html` in your browser to play.

## Nextcloud File Sharing Integration

This project also includes a branded file sharing interface for Nextcloud shares at `/drop/[token]`.

### Link Preview Feature

The `/drop/[token]` endpoint generates dynamic Open Graph meta tags for link previews in messaging apps (iMessage, WhatsApp, Facebook, etc.) with the actual filename instead of a generic "File Share" title.

#### Multi-Strategy Fallback System

The system tries 4 different strategies to fetch filenames from Nextcloud:

1. **Public Share XML** - GET `/s/{token}/files?format=xml`
2. **WebDAV with Auth** - PROPFIND `/public.php/webdav/` with Basic Auth
3. **Download Header** - HEAD `/s/{token}/download` (extract from Content-Disposition)
4. **List Proxy API** - GET `/api/list-proxy/{token}` (internal API)

If one fails, it automatically tries the next. All failures are logged for debugging.

#### Feature Flag: Smart Titles

**Environment Variable:** `NEXT_PUBLIC_ENABLE_SMART_TITLES`

**Values:**
- `true` - Enable smart title fetching
- `false` or undefined (default) - Disable, use default "File Share" title

**Default:** DISABLED (for zero-risk deployment)

**Cloudflare Pages Deployment:**
1. Go to dashboard → Settings → Environment Variables → Production
2. Add/Edit: `NEXT_PUBLIC_ENABLE_SMART_TITLES = false` (to disable)
3. Save (changes propagate in ~30 seconds)
4. **No code deployment needed** - instant toggle!

**Rollback Procedure:**

If issues occur:
1. Set `NEXT_PUBLIC_ENABLE_SMART_TITLES = false` in Cloudflare dashboard
2. Wait 30 seconds
3. Verify with: `curl -I https://dannycasio.com/drop/{token}`
4. Should show `og:title` with "File Share"

**Debug Headers:**

The response includes `X-Link-Preview-Debug` header with base64-encoded diagnostics:
```bash
curl -I https://dannycasio.com/drop/TOKEN | grep X-Link-Preview-Debug | cut -d' ' -f2 | base64 -d | jq
```

This shows which strategies were tried and why they failed.
