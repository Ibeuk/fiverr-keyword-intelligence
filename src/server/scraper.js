/**
 * Background Headless Fiverr Scraper
 * Extracts live search results, seller levels, ratings, and order queues
 * completely in the background without opening any user-visible windows or tabs.
 */

import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

export class FiverrBackgroundScraper {
  constructor() {
    this.chromePath = this.resolveChromePath();
  }

  resolveChromePath() {
    if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
      return process.env.CHROME_BIN;
    }
    const standardPaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    for (const p of standardPaths) {
      if (fs.existsSync(p)) return p;
    }
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  async searchFiverr(keyword) {
    console.log(`[Background Scraper] Starting headless search for: "${keyword}"...`);
    const cleanKw = keyword.trim();
    const searchUrl = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(cleanKw)}`;

    const browser = await puppeteer.launch({
      executablePath: this.chromePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1920,1080',
        '--lang=en-US,en'
      ]
    });

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
