/**
 * Injected Collector Script for Fiverr Search Results
 * Captures real, verified DOM state without using headless bot scrapers.
 */

(function () {
  if (window.__FIVERR_INTELLIGENCE_INJECTED__) return;
  window.__FIVERR_INTELLIGENCE_INJECTED__ = true;

  console.log('[Fiverr Intelligence] Content Script initialized.');

  function extractFiverrPage() {
    // 1. Search Query
    const urlParams = new URLSearchParams(window.location.search);
    let searchQuery = urlParams.get('query') || '';
    if (!searchQuery) {
      const searchInput = document.querySelector('input[type="search"], input[name="query"]');
      if (searchInput) searchQuery = searchInput.value;
    }
    searchQuery = searchQuery.trim();

    // 2. Extract Total Result Count (Tns)
    let rawResultCountText = '';
    const possibleCountSelectors = [
      '[data-testid="search-results-count"]',
      '.number-of-results',
      '.results-count',
      'h1.results-title',
      '.search-header h1'
    ];

    for (const sel of possibleCountSelectors) {
      const el = document.querySelector(sel);
      if (el && /\b\d[\d,]*\s*\+?\s*results?\b/i.test(el.textContent || '')) {
        rawResultCountText = el.textContent.trim();
        break;
      }
    }

    if (!rawResultCountText) {
      // Deep regex search in heading or body text
      const headings = Array.from(document.querySelectorAll('h1, h2, span, p, div'));
      const countEl = headings.find(el => {
        const text = el.textContent || '';
        return text.length < 60 && /\b[\d,]+\s*\+?\s*results?\b/i.test(text);
      });
      if (countEl) rawResultCountText = countEl.textContent.trim();
    }

    // 3. Extract Listings
    // Target gig cards using Fiverr's production selectors
    const cardSelectors = [
      '[data-testid="gig-card-layout"]',
      '.gig-card-layout',
      'div[data-gig-id]',
      '.gig-wrapper',
      'article.gig-card'
    ];

    let gigElements = [];
    for (const sel of cardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) {
        gigElements = found;
        break;
      }
    }

    // Fallback: look for gig links containing /categories/ or /seller/
    if (gigElements.length === 0) {
      const gigLinks = Array.from(document.querySelectorAll('a[href*="/gig/"], a[href^="/"][href*="-"]'));
      const cardSet = new Set();
      for (const link of gigLinks) {
        const parentCard = link.closest('div[class*="card"], div[class*="gig"]');
        if (parentCard) cardSet.add(parentCard);
      }
      gigElements = Array.from(cardSet);
    }

    const listings = gigElements.map((card, index) => {
      const position = index + 1;
      const text = card.textContent || '';

      // Link & Gig ID
      const linkEl = card.querySelector('a[href*="/"]');
      const rawHref = linkEl ? linkEl.getAttribute('href') || '' : '';
      const gigUrl = rawHref.startsWith('http') ? rawHref.split('?')[0] : `https://www.fiverr.com${rawHref.split('?')[0]}`;
      const gigId = card.getAttribute('data-gig-id') || (gigUrl.split('/').pop() || `listing_${position}`);

      // Gig Title
      const titleEl = card.querySelector('h3, [title], .gig-title, a[title]');
      const gigTitle = (titleEl ? (titleEl.getAttribute('title') || titleEl.textContent) : linkEl?.textContent || `Listing #${position}`).trim();

      // Seller Username
      const sellerEl = card.querySelector('[data-testid="seller-name"], .seller-name, .seller-info a, a[href^="/users/"]');
      let sellerUsername = sellerEl?.textContent?.trim() || '';
      if (!sellerUsername) {
        const userMatch = text.match(/by\s+([a-zA-Z0-9_-]+)/i);
        sellerUsername = userMatch ? userMatch[1] : `seller_${position}`;
      }

      // Seller Level
      let sellerLevel = 'New Seller';
      if (/Top Rated/i.test(text)) sellerLevel = 'Top Rated Seller';
      else if (/Level 2/i.test(text)) sellerLevel = 'Level 2';
      else if (/Level 1/i.test(text)) sellerLevel = 'Level 1';

      // Fiverr Choice
      const isFiverrChoice = /Fiverr's Choice/i.test(text) || !!card.querySelector('[data-testid="fiverr-choice"], .fiverr-choice');

      // Promoted / Ad
      const isPromoted = /Sponsored|Ad\b/i.test(text) || !!card.querySelector('.promoted-badge');

      // Orders In Queue: Look for Quick View overlay or inspect card text
      let ordersInQueue = null;
      const orderMatch = text.match(/(\d+)\s+orders?\s+in\s+queue/i) || text.match(/Orders:\s*(\d+)/i) || text.match(/(\d+)\s+in\s+queue/i);
      if (orderMatch) {
        ordersInQueue = parseInt(orderMatch[1], 10);
      } else {
        const qvOrderAttr = card.getAttribute('data-orders') || card.querySelector('[data-orders]')?.getAttribute('data-orders');
        if (qvOrderAttr) {
          ordersInQueue = parseInt(qvOrderAttr, 10);
        }
      }

      // Rating & Reviews
      const ratingMatch = text.match(/([45]\.\d)\s*\(([\d,]+)\)/);
      const ratingScore = ratingMatch ? parseFloat(ratingMatch[1]) : null;
      const ratingCount = ratingMatch ? parseInt(ratingMatch[2].replace(/,/g, ''), 10) : null;

      // Price
      const priceMatch = text.match(/From\s*\$([\d,]+)/i) || text.match(/\$([\d,]+)/);
      const priceStartingUSD = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;

      return {
        position,
        gigId,
        gigTitle,
        gigUrl,
        sellerUsername,
        sellerLevel,
        isFiverrChoice,
        isPromoted,
        ordersInQueue,
        ratingScore,
        ratingCount,
        priceStartingUSD
      };
    });

    return {
      searchQuery: searchQuery || 'fiverr search',
      searchUrl: window.location.href,
      capturedAt: new Date().toISOString(),
      rawResultCountText: rawResultCountText || `${listings.length} results`,
      listings,
      metadata: {
        collectorVersion: '1.0.0',
        hasQuickView: listings.some(l => l.ordersInQueue !== null),
        browserUserAgent: navigator.userAgent
      }
    };
  }

  // Inject Floating Sync Widget
  function injectWidget() {
    if (document.getElementById('fiverr-intelligence-root')) return;

    const root = document.createElement('div');
    root.id = 'fiverr-intelligence-root';

    const btn = document.createElement('button');
    btn.className = 'fki-btn';
    btn.innerHTML = `<span class="fki-badge"></span> ⚡ Analyze with Intelligence Engine`;

    btn.addEventListener('click', async () => {
      btn.innerHTML = `⏳ Extracting verified page data...`;
      const payload = extractFiverrPage();

      if (!payload.listings || payload.listings.length === 0) {
        btn.className = 'fki-btn fki-error';
        btn.innerHTML = `⚠️ No gig listings found on this page`;
        setTimeout(() => {
          btn.className = 'fki-btn';
          btn.innerHTML = `<span class="fki-badge"></span> ⚡ Analyze with Intelligence Engine`;
        }, 3000);
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/v1/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const res = await response.json();
        if (res.success) {
          btn.className = 'fki-btn fki-success';
          btn.innerHTML = `✅ Rank #${res.rank}: Avg ${res.average} (${res.strategicOpportunity})`;
        } else {
          btn.className = 'fki-btn fki-error';
          btn.innerHTML = `⚠️ ${res.message || 'Validation incomplete'}`;
        }
      } catch (err) {
        btn.className = 'fki-btn fki-error';
        btn.innerHTML = `❌ Engine offline (Start localhost:3001)`;
        console.error('[Fiverr Intelligence] Transmission error:', err);
      }
    });

    root.appendChild(btn);
    document.body.appendChild(root);

    // Auto-sync trigger if launched from dashboard search bar (?fki_auto=1)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('fki_auto') === '1') {
      setTimeout(() => {
        console.log('[Fiverr Intelligence] Auto-triggering live search sync...');
        btn.click();
      }, 2500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }

  // Listen for messages from popup
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FKI_REQUEST_CAPTURE') {
      const data = extractFiverrPage();
      window.postMessage({ type: 'FKI_CAPTURE_RESULT', payload: data }, '*');
    }
  });
})();
