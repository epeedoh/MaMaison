// Offline acceptance of the compiled Angular app. Requires Playwright and a Chromium binary.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../../frontend/MaMaison.Web/dist/MaMaison.Web/browser');
const output = process.argv[2];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

async function run() {
  assert.ok(fs.existsSync(path.join(root, 'index.html')), 'Build the production frontend first');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + (path.extname(url.pathname) ? url.pathname : '/index.html'));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end(); return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined });
    for (const width of [390, 1366]) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let failOnce = true;
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/api/fonctionnalites') return route.fulfill({ json: { terrainsActifs: true } });
        if (url.pathname === '/site-config.json') return route.fulfill({ json: { demo3dEnabled: false } });
        if (!url.pathname.startsWith('/api/')) return route.continue();
        if (!['/api/villas', '/api/locations', '/api/terrains'].includes(url.pathname)) return route.fulfill({ status: 404 });
        if (failOnce) { failOnce = false; return route.fulfill({ status: 503 }); }
        return route.fulfill({ json: { total: 1, page: 1, pageSize: Number(url.searchParams.get('pageSize')), totalPages: 1,
          items: [{ id: 'test', titre: 'Annonce de recette', quartier: 'Riviera', ville: 'Abidjan', commune: 'Cocody',
            imagePrincipaleUrl: '/images/abidjan-plateau-1280.jpg', prix: 50000000, loyer: 150000, surface: 400,
            surfaceHabitable: 90, nombrePieces: 3, totalAPrevoir: 450000, usage: 1, niveauVerification: 1,
            typeBien: 0, typeVilla: 0, scoreMaMaison: 50 }] } });
      });
      try {
        await page.goto(origin);
        await page.getByRole('alert').getByText('Annonces indisponibles').waitFor();
        await page.getByRole('button', { name: 'Réessayer' }).click();
        for (const route of ['/', '/villas', '/locations', '/terrains']) {
          if (route !== '/') await page.goto(origin + route);
          await page.locator('.card-title', { hasText: 'Annonce de recette' }).waitFor();
          await page.locator('.property-photo').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => document.querySelector('.property-photo')?.naturalWidth > 0);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'overflow: ' + route);
          if (route === '/terrains') await page.getByText('Commercial', { exact: true }).waitFor();
          if (output) {
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.screenshot({ path: path.join(output, 'catalogue-' + width + '-' + (route.slice(1) || 'accueil') + '.png') });
          }
        }
        assert.deepEqual(errors, []);
        console.log('OK: accueil, reprise 503, villas, locations, terrains; ' + width + ' px');
      } finally { await ctx.close(); }
    }
  } finally {
    try { await browser?.close(); } finally { await new Promise(resolve => server.close(resolve)); }
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
