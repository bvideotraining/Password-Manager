// content_script.js

console.log("SecureVault Content Script Loaded");

function findLoginForms() {
  const forms = document.querySelectorAll('form');
  const loginForms = [];

  forms.forEach(form => {
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    if (passwordInputs.length > 0) {
      loginForms.push(form);
    }
  });

  return loginForms;
}

function injectAutofillUI(inputField) {
  // Check if already injected
  if (inputField.parentElement.querySelector('.securevault-icon')) return;

  const icon = document.createElement('div');
  icon.className = 'securevault-icon';
  icon.innerHTML = '🛡️'; // Replace with actual SVG icon
  icon.style.cssText = `
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    cursor: pointer;
    z-index: 9999;
    font-size: 16px;
  `;

  // Ensure parent is relative for absolute positioning
  if (window.getComputedStyle(inputField.parentElement).position === 'static') {
    inputField.parentElement.style.position = 'relative';
  }

  inputField.parentElement.appendChild(icon);

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    requestCredentials(inputField);
  });
}

function requestCredentials(targetInput) {
  const domain = window.location.hostname;
  
  chrome.runtime.sendMessage({ action: "getCredentials", domain: domain }, (response) => {
    if (response && response.error) {
      alert("SecureVault: " + response.error);
      // Open popup or web app to unlock
      return;
    }

    if (response && response.credentials && response.credentials.length > 0) {
      // For simplicity, auto-fill the first match
      const cred = response.credentials[0];
      
      const form = targetInput.closest('form');
      if (form) {
        const usernameInput = form.querySelector('input[type="text"], input[type="email"]');
        const passwordInput = form.querySelector('input[type="password"]');
        
        if (usernameInput) {
          usernameInput.value = cred.username;
          usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passwordInput) {
          passwordInput.value = cred.password;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    } else {
      alert("SecureVault: No credentials found for this site.");
    }
  });
}

// Initialize
const loginForms = findLoginForms();
loginForms.forEach(form => {
  const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
  inputs.forEach(input => injectAutofillUI(input));
});

// Observe DOM for dynamically added forms
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      const newForms = findLoginForms();
      newForms.forEach(form => {
        const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
        inputs.forEach(input => injectAutofillUI(input));
      });
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });
