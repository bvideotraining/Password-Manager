// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const unlockBtn = document.getElementById('unlock-btn');
  const lockBtn = document.getElementById('lock-btn');
  const openAppBtn = document.getElementById('open-app-btn');
  const masterPasswordInput = document.getElementById('master-password');
  const statusMsg = document.getElementById('status-msg');
  
  const lockedView = document.getElementById('locked-view');
  const unlockedView = document.getElementById('unlocked-view');

  // Check initial state
  chrome.storage.local.get(['vaultLocked'], (result) => {
    if (result.vaultLocked === false) {
      showUnlocked();
    } else {
      showLocked();
    }
  });

  unlockBtn.addEventListener('click', () => {
    const password = masterPasswordInput.value;
    if (!password) {
      statusMsg.textContent = "Please enter password";
      statusMsg.style.color = "#ef4444";
      return;
    }

    // In a real app, this would derive the key and verify against a stored hash
    // For demonstration, we just simulate unlocking
    statusMsg.textContent = "Unlocking...";
    
    setTimeout(() => {
      chrome.storage.local.set({ vaultLocked: false }, () => {
        showUnlocked();
        masterPasswordInput.value = '';
      });
    }, 500);
  });

  lockBtn.addEventListener('click', () => {
    chrome.storage.local.set({ vaultLocked: true }, () => {
      showLocked();
    });
  });

  openAppBtn.addEventListener('click', () => {
    // Replace with actual deployed URL
    chrome.tabs.create({ url: 'https://securevault-app.com/dashboard' });
  });

  function showLocked() {
    lockedView.style.display = 'block';
    unlockedView.style.display = 'none';
    statusMsg.textContent = "Vault is locked";
    statusMsg.style.color = "#a1a1aa";
  }

  function showUnlocked() {
    lockedView.style.display = 'none';
    unlockedView.style.display = 'block';
  }
});
