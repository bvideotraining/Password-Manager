// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("SecureVault Extension Installed");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCredentials") {
    // In a real implementation, this would securely communicate with the web app
    // or use chrome.storage.local to retrieve the encrypted vault,
    // prompt the user for the master password if locked, and decrypt.
    
    chrome.storage.local.get(['vaultLocked', 'credentials'], (result) => {
      if (result.vaultLocked !== false) {
        sendResponse({ error: "Vault is locked" });
        return;
      }
      
      const domain = request.domain;
      const credentials = result.credentials || [];
      const matches = credentials.filter(c => c.url.includes(domain));
      
      sendResponse({ credentials: matches });
    });
    
    return true; // Indicates async response
  }
});
