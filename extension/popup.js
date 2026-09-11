document.addEventListener('DOMContentLoaded', async () => {
  const backendStatus = document.getElementById('backendStatus');
  const syncBtn = document.getElementById('syncBtn');
  const openDashboardBtn = document.getElementById('openDashboardBtn');

  // Check backend health
  try {
    const res = await fetch('http://localhost:3001/api/v1/health');
    if (res.ok) {
      backendStatus.textContent = '🟢 Connected (Port 3001)';
      backendStatus.style.color = '#10b981';
    } else {
      backendStatus.textContent = '🟡 Degraded';
      backendStatus.style.color = '#f59e0b';
    }
  } catch (e) {
    backendStatus.textContent = '🔴 Offline';
    backendStatus.style.color = '#ef4444';
  }

  // Open Web Dashboard
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3001' });
  });

  // Sync Current Fiverr Page
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = 'Extracting...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url.includes('fiverr.com/search/gigs')) {
      syncBtn.textContent = '⚠️ Please open a Fiverr search';
      syncBtn.disabled = false;
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const btn = document.querySelector('.fki-btn');
        if (btn) btn.click();
      }
    });

    syncBtn.textContent = '✅ Extraction Triggered!';
    setTimeout(() => {
      syncBtn.disabled = false;
      syncBtn.textContent = '⚡ Sync Current Fiverr Page';
    }, 2000);
  });
});
