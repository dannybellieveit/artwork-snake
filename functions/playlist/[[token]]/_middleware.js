// Cloudflare Pages Function - runs before the page is served
// Redirects bots to the SSR server for proper link previews, the same way
// functions/drop/[[token]]/_middleware.js already does for /drop/TOKEN.
// The playlist page is client-rendered, so a bot hitting it directly would
// otherwise only ever see the static "Danny Casio / Listen to the tracks"
// tags baked into playlist/index.html.

const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'whatsapp',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'telegrambot',
  'pinterest',
  'bot',
  'crawler',
  'spider',
  'preview'
];

function isBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

export async function onRequest(context) {
  const { request } = context;
  const userAgent = request.headers.get('user-agent') || '';

  if (isBot(userAgent)) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/playlist\/([^/]+)\/?$/);
    if (match) {
      // The SSR server only knows /drop/TOKEN?N paths (see drop-ssr's
      // server.js) — ?3 is "playlist page" mode, which is all the preview
      // card needs regardless of any ?nd/?ndis on the real playlist URL
      // (those only affect the page's own UI, not its title/description).
      const targetUrl = `https://drop.dannycasio.com/drop/${match[1]}?3`;
      return Response.redirect(targetUrl, 308);
    }
  }

  // Otherwise, continue to the page
  return context.next();
}
