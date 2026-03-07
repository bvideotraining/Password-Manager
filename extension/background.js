import { getCredentialsForDomain, saveCredential } from './vault_api.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCredentials') {
    getCredentialsForDomain(request.domain).then(credentials => {
      sendResponse({ credentials });
    });
    return true; // Indicates asynchronous response
  }
  if (request.action === 'saveCredential') {
    saveCredential(request.credential).then(success => {
      sendResponse({ success });
    });
    return true;
  }
});
