import { saveCredential } from './vault_api.js';

document.addEventListener('DOMContentLoaded', () => {
  // Get current tab domain
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      const url = new URL(tab.url);
      document.getElementById('domain').value = url.hostname;
    }
  });

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
      setTimeout(() => {
        window.close();
      }, 1500);
    });
  });
});
