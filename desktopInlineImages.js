const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Keep large clipboard image strings out of Monaco and Markdown parsing.
// The source document is never overwritten; extracted assets remain beside it.
function externalizeInlineImages(content, sourcePath) {
  if (!/\.md$/i.test(sourcePath) || !content.includes('data:image/')) return content;
  const extensions = { png: 'png', jpeg: 'jpg', jpg: 'jpg', gif: 'gif', webp: 'webp', bmp: 'bmp', 'svg+xml': 'svg', avif: 'avif' };
  return content.replace(/data:image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml|avif);base64,([A-Za-z0-9+/=]+)/gi, (original, type, payload) => {
    if (payload.length < 4096) return original;
    const bytes = Buffer.from(payload, 'base64');
    if (!bytes.length) return original;
    const name = `img_${crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.${extensions[type.toLowerCase()]}`;
    const directory = path.join(path.dirname(sourcePath), '.onrivi-media');
    fs.mkdirSync(directory, { recursive: true });
    const target = path.join(directory, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: 'wx' });
    return `media://local/serve?url=${encodeURIComponent(target)}`;
  });
}
module.exports = { externalizeInlineImages };
