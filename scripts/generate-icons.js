/**
 * Renders the app icons (Sparky the star hero) from SVG using the Playwright-bundled Chromium.
 * Run: node scripts/generate-icons.js   (requires `playwright` available to Node)
 */
const path = require('path');

function star(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const mascot = (mono = false) => {
  const c = (color) => (mono ? '#FFFFFF' : color);
  return `
  ${mono ? '' : `<path d="M30 40 Q 12 78 18 97 Q 50 88 82 97 Q 88 78 70 40 Z" fill="#3F2A8C"/>`}
  <polygon points="${star(50, 54, 44, 22)}" fill="${c('#FFC531')}" stroke="${c('#E0A100')}" stroke-width="2.5" stroke-linejoin="round"/>
  ${
    mono
      ? ''
      : `<path d="M30 48 Q 50 40 70 48 L 70 56 Q 50 50 30 56 Z" fill="#5B3CC4"/>
  <ellipse cx="41" cy="51" rx="5" ry="5" fill="#fff"/><ellipse cx="59" cy="51" rx="5" ry="5" fill="#fff"/>
  <circle cx="42" cy="51.5" r="2.6" fill="#1E1A3C"/><circle cx="60" cy="51.5" r="2.6" fill="#1E1A3C"/>
  <circle cx="35" cy="62" r="3.5" fill="#FF8FA3" opacity="0.7"/><circle cx="65" cy="62" r="3.5" fill="#FF8FA3" opacity="0.7"/>
  <path d="M42 61 Q 50 74 58 61 Z" fill="#7A1F3D" stroke="#1E1A3C" stroke-width="1.5" stroke-linejoin="round"/>`
  }`;
};

const sparkles = `<polygon points="${star(14, 16, 6, 2.5)}" fill="#FFE27A"/>
  <polygon points="${star(87, 14, 5, 2)}" fill="#FFE27A"/>
  <polygon points="${star(88, 86, 4, 1.6)}" fill="#FFE27A"/>`;

const svg = (size, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg ?? ''}${body}</svg>`;

const ICONS = [
  // iOS / general icon: opaque purple background
  {
    file: 'icon.png',
    size: 1024,
    html: svg(
      1024,
      `<g transform="translate(8 8) scale(0.84)">${mascot()}</g>${sparkles}`,
      '<rect width="100" height="100" fill="#5B3CC4"/>',
    ),
  },
  {
    file: 'android-icon-background.png',
    size: 512,
    html: svg(512, '', '<rect width="100" height="100" fill="#5B3CC4"/>'),
  },
  // Adaptive foreground: keep inside the central safe zone (~66%)
  {
    file: 'android-icon-foreground.png',
    size: 512,
    html: svg(512, `<g transform="translate(20 20) scale(0.6)">${mascot()}</g>`),
  },
  {
    file: 'android-icon-monochrome.png',
    size: 432,
    html: svg(432, `<g transform="translate(20 20) scale(0.6)">${mascot(true)}</g>`),
  },
  {
    file: 'splash-icon.png',
    size: 1024,
    html: svg(1024, `<g transform="translate(5 5) scale(0.9)">${mascot()}</g>`),
  },
  {
    file: 'favicon.png',
    size: 48,
    html: svg(48, mascot(), '<rect width="100" height="100" rx="22" fill="#5B3CC4"/>'),
  },
];

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    ({ chromium } = require(process.env.PLAYWRIGHT_MODULE));
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const icon of ICONS) {
    await page.setViewportSize({ width: icon.size, height: icon.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${icon.html}</body></html>`,
    );
    await page.screenshot({
      path: path.join(__dirname, '..', 'assets', icon.file),
      omitBackground: true,
      clip: { x: 0, y: 0, width: icon.size, height: icon.size },
    });
    console.warn('wrote', icon.file);
  }
  await browser.close();
})();
