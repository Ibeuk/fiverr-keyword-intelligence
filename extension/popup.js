document.addEventListener('DOMContentLoaded', async () => {
  const backendStatus = document.getElementById('backendStatus');
  const syncBtn = document.getElementById('syncBtn');
  const openDashboardBtn = document.getElementById('openDashboardBtn');

  const serverUrlInput = document.getElementById('serverUrlInput');

  // Load saved server URL
  const stored = await chrome.storage.local.get(['fki_server_url']);
  const serverUrl = stored.fki_server_url || 'http://localhost:3001';
  serverUrlInput.value = serverUrl;

  async function checkHealth(url) {
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/api/v1/health`);
      if (res.ok) {
        backendStatus.textContent = '🟢 Connected';
        backendStatus.style.color = '#10b981';
      } else {
        backendStatus.textContent = '🟡 Degraded';
        backendStatus.style.color = '#f59e0b';
      }
    } catch (e) {
      backendStatus.textContent = '🔴 Offline';
      backendStatus.style.color = '#ef4444';
    }
  }

  checkHealth(serverUrl);

  serverUrlInput.addEventListener('change', async () => {
    const newUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
    await chrome.storage.local.set({ fki_server_url: newUrl });
    checkHealth(newUrl);
  });

  // Open Web Dashboard
  openDashboardBtn.addEventListener('click', () => {
    const currentUrl = serverUrlInput.value.trim().replace(/\/+$/, '') || 'http://localhost:3001';
    chrome.tabs.create({ url: currentUrl });
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
