// vault_api.js
// This is a mock/stub for the Vault API.
// In a real scenario, this would authenticate with Firebase and decrypt data.

export async function getCredentialsForDomain(domain) {
  // Mock data for demonstration
  // The extension would normally fetch from the SecureVault backend
  return new Promise((resolve) => {
    chrome.storage.local.get(['vault_credentials'], (result) => {
      const allCreds = result.vault_credentials || [];
      const domainCreds = allCreds.filter(c => domain.includes(c.domain) || c.domain.includes(domain));
      
      // Add some dummy data if empty for testing
      if (domainCreds.length === 0 && domain.includes('example.com')) {
        resolve([{ username: 'testuser', password: 'password123', domain: 'example.com' }]);
      } else {
        resolve(domainCreds);
      }
    });
  });
}

export async function getAllCredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vault_credentials'], (result) => {
      resolve(result.vault_credentials || []);
    });
  });
}

export async function saveMultipleCredentials(credentials) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vault_credentials'], (result) => {
      const allCreds = result.vault_credentials || [];
      const updatedCreds = [...allCreds, ...credentials];
      chrome.storage.local.set({ vault_credentials: updatedCreds }, () => {
        resolve(true);
      });
    });
  });
}

export async function saveCredential(credential) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['vault_credentials'], (result) => {
      const allCreds = result.vault_credentials || [];
      allCreds.push(credential);
      chrome.storage.local.set({ vault_credentials: allCreds }, () => {
        resolve(true);
      });
    });
  });
}

export async function syncLogins(logins) {
  return new Promise((resolve) => {
    // Map web app logins to extension format
    const formattedLogins = logins.map(login => {
      let domain = login.website_name.toLowerCase();
      try {
        if (login.website_url) {
          const urlStr = login.website_url.startsWith('http') ? login.website_url : `https://${login.website_url}`;
          domain = new URL(urlStr).hostname;
        }
      } catch (e) {
        // Fallback to website name if URL parsing fails
      }
      return {
        username: login.username,
        password: login.password,
        domain: domain
      };
    });
    
    chrome.storage.local.set({ vault_credentials: formattedLogins }, () => {
      resolve(true);
    });
  });
}
