# Artwork Snake

A small snake game that uses images for the snake body. Open `index.html` in your browser to play.

## Nextcloud File Sharing Integration

This project includes a branded file sharing interface for Nextcloud shares at `/drop/[token]`.

### Link Preview Feature ✅ WORKING

Link previews in messaging apps (iMessage, WhatsApp, Facebook, etc.) now show **actual filenames** instead of "File Share".

#### How It Works

**Cloudflare Pages Function** (`functions/drop/[[token]]/_middleware.js`):
- Runs before serving the page (edge function)
- Detects bot user-agents (Facebook, WhatsApp, iMessage crawlers)
- **Bots:** Redirects (308) to `drop.dannycasio.com` (SSR server with proper og:title)
- **Humans:** Serves static file browser page

**SSR Server** (Hetzner server at drop.dannycasio.com):
- Detects bot user-agents
- Fetches filename from Nextcloud via WebDAV PROPFIND
- Returns HTML with `<meta property="og:title" content="filename.mp3">`
- Redirects humans to dannycasio.com

#### Supported Link Formats

Both work correctly:
1. `transfer.dannycasio.com/s/{token}?1` - Original Nextcloud share links
2. `dannycasio.com/drop/{token}` - Direct share links

#### Testing

**Test bot preview:**
```bash
curl -sL -A "facebookexternalhit/1.1" "https://dannycasio.com/drop/TOKEN" | grep og:title
# Should show: <meta property="og:title" content="filename.mp3">
```

**Test human access:**
```bash
curl -sI "https://dannycasio.com/drop/TOKEN"
# Should return: HTTP/2 200 (static page, no redirect)
```

#### Deployment

- **Auto-deploys** on push to main branch
- No configuration needed
- Cloudflare Pages automatically detects and runs Functions

#### Architecture

See full documentation: `/docs/LINK-PREVIEW-ARCHITECTURE.md`
