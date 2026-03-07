import { getCredentialsForDomain, saveCredential, syncLogins } from './vault_api.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCredentials') {
    getCredentialsForDomain(request.domain).then(credentials => {
      sendResponse({ credentials });
    });
    return true; // Indicates asynchronous response
  }
  if (request.action === 'saveCredential') {
    saveCredential(request.credential).then(success => {
      // Notify content script to sync back to web app if it's open
      chrome.tabs.query({ url: "*://*.run.app/*" }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { action: "newCredentialSaved", credential: request.credential });
        });
      });
      sendResponse({ success });
    });
    return true;
  }
  if (request.action === 'syncLogins') {
    syncLogins(request.logins).then(success => {
      sendResponse({ success });
    });
    return true;
  }
});
