// CORS headers (Electron desktop app origin support)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

function detectPlatform(url) {
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/instagram\.com/.test(url)) return 'instagram';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/twitch\.tv/.test(url)) return 'twitch';
  if (/dailymotion\.com/.test(url)) return 'dailymotion';
  return null;
}

function getOEmbedEndpoint(platform, url) {
  const encoded = encodeURIComponent(url);
  switch (platform) {
    case 'tiktok':
      return { url: `https://www.tiktok.com/oembed?url=${encoded}`, format: 'json' };
    case 'instagram':
      return { url: `https://api.instagram.com/oembed?url=${encoded}`, format: 'json' };
    case 'vimeo':
      return { url: `https://vimeo.com/api/oembed.json?url=${encoded}`, format: 'json' };
    case 'twitch':
      return { url: `https://api.twitch.tv/oembed?url=${encoded}`, format: 'json' };
    case 'dailymotion':
      return { url: `https://www.dailymotion.com/services/oembed?url=${encoded}`, format: 'json' };
    default:
      return null;
  }
}

export async function onRequestGet(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const platform = detectPlatform(targetUrl);
    if (!platform) {
      return new Response(JSON.stringify({ error: 'Unsupported platform' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const oembed = getOEmbedEndpoint(platform, targetUrl);

    const resp = await fetch(oembed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnriviMarkDown/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `oEmbed request failed: ${resp.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const data = await resp.json();

    return new Response(JSON.stringify({
      thumbnail_url: data.thumbnail_url || data.thumbnail_url || null,
      title: data.title || null,
      author_name: data.author_name || data.author_name || null,
      html: data.html || null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        ...corsHeaders
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
