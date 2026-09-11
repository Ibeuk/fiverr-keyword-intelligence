/**
 * Background Headless Fiverr Scraper
 * Extracts live search results, seller levels, ratings, and order queues
 * completely in the background without opening any user-visible windows or tabs.
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export class FiverrBackgroundScraper {
  constructor() {
    this.chromePath = this.resolveChromePath();
  }

  findPuppeteerCacheChrome() {
    const searchDirs = [
      path.join(os.homedir(), '.cache', 'puppeteer'),
      '/opt/render/.cache/puppeteer',
      path.join(process.cwd(), '.cache', 'puppeteer')
    ];
    for (const base of searchDirs) {
      if (!fs.existsSync(base)) continue;
      try {
        const queue = [base];
        while (queue.length > 0) {
          const curr = queue.shift();
          const entries = fs.readdirSync(curr, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(curr, entry.name);
            if (entry.isDirectory()) {
              queue.push(full);
            } else if (entry.isFile()) {
              if (entry.name === 'chrome' || entry.name === 'chrome-headless-shell' || entry.name === 'chrome.exe') {
                return full;
              }
            }
          }
        }
      } catch (e) {}
    }
    return undefined;
  }

  resolveChromePath() {
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
      return process.env.CHROME_BIN;
    }
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidatePaths = [
      // Linux binaries (Docker / Render / Ubuntu / Alpine)
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      // Windows binaries
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ];

    if (process.env.LOCALAPPDATA) {
      candidatePaths.push(
        path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      );
    }

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) return p;
    }

    // Check if downloaded into puppeteer cache directory
    const cachedChrome = this.findPuppeteerCacheChrome();
    if (cachedChrome) return cachedChrome;

    return undefined;
  }

  async searchFiverr(keyword) {
    console.log(`[Background Scraper] Starting headless search for: "${keyword}"...`);
    const cleanKw = keyword.trim();
    const searchUrl = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(cleanKw)}`;

    const launchArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--window-size=1920,1080',
      '--lang=en-US,en'
    ];

    const resolved = this.resolveChromePath();
    const launchOptions = {
      headless: true,
      args: launchArgs
    };

    if (resolved) {
      launchOptions.executablePath = resolved;
      console.log(`[Background Scraper] Using resolved browser binary: ${resolved}`);
    } else {
      console.log(`[Background Scraper] No system browser path matched. Launching default Puppeteer bundle.`);
    }

    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (launchErr) {
      console.error(`[Background Scraper] Puppeteer launch failed:`, launchErr.message);
      throw new Error(
        `Headless browser could not be launched on host: ${launchErr.message}. ` +
        `If running on Render: Switch your service to Docker runtime in Settings, or add build command 'npm install && npx puppeteer browsers install chrome'.`
      );
    }

    try {
      const page = await browser.newPage();
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      // Allow 3 seconds for dynamic React listing cards to hydrate
      await new Promise(r => setTimeout(r, 3000));

      const searchData = await page.evaluate((kw, currentUrl) => {
        const text = document.body.textContent || '';
        const isBlocked = text.includes('PerimeterX') || text.includes('Press & Hold') || text.includes('Access Denied');

        let rawCountText = '';
        const headings = Array.from(document.querySelectorAll('h1, h2, span, p, div'));
        const countEl = headings.find(el => {
          const t = el.textContent || '';
          return t.length < 80 && /\b[\d,]+\s*\+?\s*results?\b/i.test(t);
        });
        if (countEl) rawCountText = countEl.textContent.trim();

        const cards = Array.from(document.querySelectorAll('[data-testid="gig-card-layout"], .gig-card-layout, div[data-gig-id], .gig-wrapper'));
        const seen = new Set();
        const listings = [];

        for (let i = 0; i < cards.length; i++) {
          const c = cards[i];
          try {
            const cardText = c.textContent || '';
            const link = c.querySelector('a[href*="/"]');
            if (!link) continue;
            const href = link.href.split('?')[0];
            if (!href.startsWith('http') || seen.has(href)) continue;
            seen.add(href);

            const parts = href.replace('https://www.fiverr.com/', '').split('/');
            const seller = parts[0] || 'seller';
            const slug = parts[1] || '';
            const titleFromSlug = slug.replace(/-/g, ' ');

            let level = 'New Seller';
            if (/Top Rated/i.test(cardText)) level = 'Top Rated Seller';
            else if (/Level 2/i.test(cardText)) level = 'Level 2';
            else if (/Level 1/i.test(cardText)) level = 'Level 1';

            const isChoice = /Fiverr's Choice/i.test(cardText);
            const isPromoted = /Sponsored|Ad\b/i.test(cardText);

            const rMatch = cardText.match(/([45]\.\d)\s*\(([\d,]+)\)/);
            const ratingScore = rMatch ? parseFloat(rMatch[1]) : null;
            const ratingCount = rMatch ? parseInt(rMatch[2].replace(/,/g, ''), 10) : null;

            listings.push({
              position: listings.length + 1,
              gigId: parts[1] || `gig_${listings.length + 1}`,
              gigTitle: titleFromSlug || `Listing #${listings.length + 1}`,
              gigUrl: href,
              sellerUsername: seller,
              sellerLevel: level,
              isFiverrChoice: isChoice,
              isPromoted,
              ordersInQueue: 0, // Enriched in next step
              ratingScore,
              ratingCount
            });
          } catch (e) {}
        }

        return {
          isBlocked,
          searchQuery: kw,
          searchUrl: currentUrl,
          rawResultCountText: rawCountText || `${listings.length} results`,
          listings
        };
      }, cleanKw, searchUrl);

      if (searchData.isBlocked) {
        throw new Error('Fiverr bot challenge detected. Automated request blocked.');
      }

      console.log(`[Background Scraper] Found ${searchData.listings.length} listings. Total count: "${searchData.rawResultCountText}"`);

      // Inspect order queues for the top 6 listings in parallel
      const topListings = searchData.listings.slice(0, 6);
      if (topListings.length > 0) {
        console.log(`[Background Scraper] Checking orders in queue for top ${topListings.length} listings...`);
        await Promise.all(topListings.map(async (gig) => {
          const detailPage = await browser.newPage();
          try {
            await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36');
            await detailPage.goto(gig.gigUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
            await new Promise(r => setTimeout(r, 1200));

            const orders = await detailPage.evaluate(() => {
              const bodyText = document.body.textContent || '';
              const match = bodyText.match(/(\d+)\s+orders?\s+in\s+queue/i);
              return match ? parseInt(match[1], 10) : 0;
            });

            gig.ordersInQueue = orders;
            console.log(`[Background Scraper] -> ${gig.sellerUsername}: ${orders} orders in queue`);
          } catch (err) {
            console.log(`[Background Scraper] -> ${gig.sellerUsername}: Order check timed out (assuming 0).`);
          } finally {
            await detailPage.close();
          }
        }));
      }

      return {
        searchQuery: searchData.searchQuery,
        searchUrl: searchData.searchUrl,
        capturedAt: new Date().toISOString(),
        rawResultCountText: searchData.rawResultCountText,
        listings: searchData.listings
      };

    } finally {
      await browser.close();
      console.log('[Background Scraper] Headless browser closed.');
    }
  }
}
