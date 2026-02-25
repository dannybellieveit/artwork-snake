// Cloudflare Pages Function - runs before the page is served
// Redirects bots to SSR server for proper link previews

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

  // If it's a bot, redirect to SSR server
  if (isBot(userAgent)) {
    const url = new URL(request.url);
    const targetUrl = `https://drop.dannycasio.com${url.pathname}${url.search}`;
    return Response.redirect(targetUrl, 308);
  }

  // Otherwise, continue to the page
  return context.next();
}
