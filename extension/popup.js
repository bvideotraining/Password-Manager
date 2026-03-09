import { saveCredential, getCredentialsForDomain, getAllCredentials, saveMultipleCredentials } from './vault_api.js';

document.addEventListener('DOMContentLoaded', () => {
  const mainActions = document.getElementById('mainActions');
  const generatorSection = document.querySelector('.generator-section');
  const credentialsContainer = document.getElementById('credentialsContainer');
  const allLoginsContainer = document.getElementById('allLoginsContainer');
  const allLoginsList = document.getElementById('allLoginsList');

  // Get current tab domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      try {
        const url = new URL(tab.url);
        const domain = url.hostname;
        document.getElementById('domain').value = domain;
        
        // Load existing credentials
        loadCredentials(domain);
      } catch (e) {
        console.error("Invalid URL", tab.url);
      }
    }
  });

  document.getElementById('viewAllBtn').addEventListener('click', () => {
    credentialsContainer.style.display = 'none';
    mainActions.style.display = 'none';
    generatorSection.style.display = 'none';
    allLoginsContainer.style.display = 'block';
    loadAllLogins();
  });

  document.getElementById('backToSiteBtn').addEventListener('click', () => {
    allLoginsContainer.style.display = 'none';
    credentialsContainer.style.display = 'block';
    mainActions.style.display = 'block';
    generatorSection.style.display = 'block';
  });

  function loadAllLogins() {
    getAllCredentials().then(credentials => {
      allLoginsList.innerHTML = '';
      if (credentials && credentials.length > 0) {
        credentials.forEach(cred => {
          const item = document.createElement('div');
          item.className = 'credential-item';
          item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="user">${cred.username}</div>
              <div style="font-size: 10px; color: #6b7280;">${cred.domain}</div>
            </div>
            <div class="pass-row">
              <div class="pass">••••••••</div>
              <button class="action-btn copy-btn" data-pass="${cred.password}">Copy</button>
            </div>
          `;
          
          item.querySelector('.copy-btn').addEventListener('click', (e) => {
            const pass = e.target.getAttribute('data-pass');
            navigator.clipboard.writeText(pass);
            e.target.textContent = 'Copied!';
            setTimeout(() => e.target.textContent = 'Copy', 2000);
          });
          
          allLoginsList.appendChild(item);
        });
      } else {
        allLoginsList.innerHTML = '<div style="text-align: center; font-size: 12px; color: #6b7280; padding: 20px;">No logins found</div>';
      }
    });
  }

  function loadCredentials(domain) {
    getCredentialsForDomain(domain).then(credentials => {
      if (credentials && credentials.length > 0) {
        const container = document.getElementById('credentialsContainer');
        const list = document.getElementById('credentialsList');
        container.style.display = 'block';
        list.innerHTML = '';
        
        credentials.forEach(cred => {
          const item = document.createElement('div');
          item.className = 'credential-item';
          item.innerHTML = `
            <div class="user">${cred.username}</div>
            <div class="pass-row">
              <div class="pass">••••••••</div>
              <button class="action-btn fill-btn" data-user="${cred.username}" data-pass="${cred.password}">Fill</button>
              <button class="action-btn copy-btn" data-pass="${cred.password}">Copy</button>
            </div>
          `;
          
          item.querySelector('.copy-btn').addEventListener('click', (e) => {
            const pass = e.target.getAttribute('data-pass');
            navigator.clipboard.writeText(pass);
            e.target.textContent = 'Copied!';
            setTimeout(() => e.target.textContent = 'Copy', 2000);
          });

          item.querySelector('.fill-btn').addEventListener('click', (e) => {
            const user = e.target.getAttribute('data-user');
            const pass = e.target.getAttribute('data-pass');
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              chrome.tabs.sendMessage(tabs[0].id, { 
                action: "fillForm", 
                username: user, 
                password: pass 
              });
            });
          });
          
          list.appendChild(item);
        });
      }
    });
  }

  // Password Generator
  function generateSimplePassword(length = 16) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
  }

  document.getElementById('genBtn').addEventListener('click', () => {
    document.getElementById('genPassword').value = generateSimplePassword();
  });

  document.getElementById('copyGenBtn').addEventListener('click', () => {
    const pass = document.getElementById('genPassword').value;
    if (pass) {
      navigator.clipboard.writeText(pass);
      const btn = document.getElementById('copyGenBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy Generated', 2000);
    }
  });

  // Initial generation
  document.getElementById('genPassword').value = generateSimplePassword();

  document.getElementById('saveBtn').addEventListener('click', () => {
    const domain = document.getElementById('domain').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!domain || !username || !password) {
      alert('Please fill all fields');
      return;
    }

    saveCredential({ domain, username, password }).then(() => {
      const msg = document.getElementById('successMsg');
      msg.style.display = 'block';
      loadCredentials(domain);
      setTimeout(() => {
        msg.style.display = 'none';
      }, 2000);
    });
  });

  document.getElementById('syncBtn').addEventListener('click', () => {
    // Try to find an existing tab with the vault open
    chrome.tabs.query({}, (tabs) => {
      // Look for a tab that is already on our app (dev or shared)
      const vaultTab = tabs.find(t => t.url && (t.url.includes('run.app') && (t.url.includes('dashboard') || t.url.includes('logins'))));
      
      if (vaultTab) {
        // If found, just activate it and refresh it to trigger sync
        chrome.tabs.update(vaultTab.id, { active: true });
        chrome.windows.update(vaultTab.windowId, { focused: true });
        // Refresh to trigger sync
        chrome.tabs.reload(vaultTab.id);
        window.close(); // Close popup
      } else {
        // If not found, open the SHARED URL which is often more stable for auth
        const sharedUrl = 'https://ais-pre-hhbluvqmechum52vds4szj-163451659945.europe-west2.run.app/dashboard/logins';
        
        // Open the shared URL
        chrome.tabs.create({ url: sharedUrl });
        
        // Show a small hint in the popup
        const msg = document.getElementById('successMsg');
        msg.textContent = 'Opening Vault... If you see a 403 error, please open the web app manually by typing the URL in your browser.';
        msg.style.color = '#dc2626'; // Red for warning
        msg.style.display = 'block';
      }
    });
  });

  // CSV Export
  document.getElementById('exportBtn').addEventListener('click', () => {
    getAllCredentials().then(credentials => {
      if (!credentials || credentials.length === 0) {
        alert('No credentials to export');
        return;
      }

      const headers = ['domain', 'username', 'password'];
      const csvRows = [headers.join(',')];

      credentials.forEach(cred => {
        const row = [
          `"${cred.domain.replace(/"/g, '""')}"`,
          `"${cred.username.replace(/"/g, '""')}"`,
          `"${cred.password.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'securevault_export.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  // CSV Import
  const csvFileInput = document.getElementById('csvFileInput');
  document.getElementById('importBtn').addEventListener('click', () => {
    csvFileInput.click();
  });

  csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const credentials = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser (handles quotes)
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (parts && parts.length >= 3) {
          credentials.push({
            domain: parts[0].replace(/^"|"$/g, '').replace(/""/g, '"'),
            username: parts[1].replace(/^"|"$/g, '').replace(/""/g, '"'),
            password: parts[2].replace(/^"|"$/g, '').replace(/""/g, '"')
          });
        }
      }

      if (credentials.length > 0) {
        saveMultipleCredentials(credentials).then(() => {
          alert(`Successfully imported ${credentials.length} credentials`);
          loadAllLogins();
          // Reset file input
          csvFileInput.value = '';
        });
      } else {
        alert('No valid credentials found in CSV');
      }
    };
    reader.readAsText(file);
  });
});
