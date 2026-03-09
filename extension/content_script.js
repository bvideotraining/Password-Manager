// content_script.js

function detectLoginForms() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(passwordInput => {
    if (passwordInput.dataset.svProcessed) return;
    passwordInput.dataset.svProcessed = "true";

    // Find associated username input
    const form = passwordInput.closest('form');
    let usernameInput = null;
    if (form) {
      usernameInput = form.querySelector('input[type="text"], input[type="email"], input:not([type="password"])');
    } else {
      // Look for previous sibling inputs
      const inputs = Array.from(document.querySelectorAll('input'));
      const passIndex = inputs.indexOf(passwordInput);
      if (passIndex > 0) {
        usernameInput = inputs[passIndex - 1];
      }
    }

    addAutofillIcon(usernameInput, passwordInput);
  });
}

function addAutofillIcon(usernameInput, passwordInput) {
  const icon = document.createElement('div');
  icon.className = 'sv-autofill-icon';
  icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
  
  // Position icon inside the password field
  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.width = passwordInput.offsetWidth ? passwordInput.offsetWidth + 'px' : '100%';
  
  passwordInput.parentNode.insertBefore(wrapper, passwordInput);
  wrapper.appendChild(passwordInput);
  wrapper.appendChild(icon);

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showAutofillSuggestion(usernameInput, passwordInput, icon);
  });
}

function showAutofillSuggestion(usernameInput, passwordInput, iconElement) {
  const domain = window.location.hostname;
  
  chrome.runtime.sendMessage({ action: 'getCredentials', domain: domain }, (response) => {
    if (response && response.credentials && response.credentials.length > 0) {
      renderSuggestionPopup(response.credentials, usernameInput, passwordInput, iconElement);
    } else {
      alert('SecureVault: No credentials found for ' + domain);
    }
  });
}

function renderSuggestionPopup(credentials, usernameInput, passwordInput, iconElement) {
  // Remove existing popup if any
  const existing = document.getElementById('sv-suggestion-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'sv-suggestion-popup';
  popup.className = 'sv-popup';

  const title = document.createElement('div');
  title.className = 'sv-popup-title';
  title.innerText = 'SecureVault Autofill';
  popup.appendChild(title);

  credentials.forEach(cred => {
    const item = document.createElement('div');
    item.className = 'sv-popup-item';
    item.innerText = cred.username;
    item.addEventListener('click', () => {
      if (usernameInput) {
        usernameInput.value = cred.username;
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      passwordInput.value = cred.password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      popup.remove();
    });
    popup.appendChild(item);
  });

  document.body.appendChild(popup);

  // Position popup near the icon
  const rect = iconElement.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
  popup.style.left = (rect.left + window.scrollX - 150) + 'px';

  // Close popup when clicking outside
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target) && e.target !== iconElement) {
      popup.remove();
      document.removeEventListener('click', closePopup);
    }
  });
}

// Run detection periodically to catch dynamically loaded forms
setInterval(detectLoginForms, 2000);
detectLoginForms();

// Listen for sync messages from the web app
window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.type && (event.data.type === "SECUREVAULT_SYNC_LOGINS")) {
    chrome.runtime.sendMessage({ action: "syncLogins", logins: event.data.logins }, (response) => {
      console.log("SecureVault: Logins synced to extension");
    });
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "newCredentialSaved") {
    window.postMessage({ type: "SECUREVAULT_NEW_CREDENTIAL", credential: request.credential }, "*");
  }
  
  if (request.action === "fillForm") {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(passwordInput => {
      passwordInput.value = request.password;
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Try to find associated username input
      const form = passwordInput.closest('form');
      let usernameInput = null;
      if (form) {
        usernameInput = form.querySelector('input[type="text"], input[type="email"], input:not([type="password"])');
      }
      
      if (usernameInput) {
        usernameInput.value = request.username;
        usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  if (request.action === "showSavePrompt") {
    showSavePrompt(request.domain, request.username, request.password);
  }
});

function showSavePrompt(domain, username, password) {
  // Remove existing prompt if any
  const existing = document.getElementById('sv-save-prompt');
  if (existing) existing.remove();

  const prompt = document.createElement('div');
  prompt.id = 'sv-save-prompt';
  prompt.className = 'sv-save-prompt';

  prompt.innerHTML = `
    <div class="sv-save-prompt-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      <span>Save to SecureVault?</span>
    </div>
    <div class="sv-save-prompt-body">
      Do you want to save the password for <strong>${username}</strong> on <strong>${domain}</strong>?
    </div>
    <div class="sv-save-prompt-footer">
      <button id="sv-never-btn" class="sv-btn sv-btn-secondary">Never</button>
      <button id="sv-save-btn" class="sv-btn sv-btn-primary">Save</button>
    </div>
  `;

  document.body.appendChild(prompt);

  document.getElementById('sv-save-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      action: 'saveCredential', 
      credential: { domain, username, password } 
    }, (response) => {
      if (response && response.success) {
        prompt.innerHTML = `
          <div class="sv-save-prompt-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Saved!</span>
          </div>
        `;
        setTimeout(() => prompt.remove(), 2000);
      }
    });
  });

  document.getElementById('sv-never-btn').addEventListener('click', () => {
    prompt.remove();
  });
}

// Form submission detection
document.addEventListener('submit', (e) => {
  handleLoginAttempt(e.target);
}, true);

// Click detection for non-form logins
document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button'))) {
    // Look for nearby password fields
    const form = target.closest('form');
    if (form) {
      handleLoginAttempt(form);
    } else {
      // Look for password fields in the whole document if not in a form
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      passwordInputs.forEach(passInput => {
        if (passInput.value) {
          // Find associated username
          const usernameInput = document.querySelector('input[type="text"], input[type="email"]');
          if (usernameInput && usernameInput.value) {
            const domain = window.location.hostname;
            chrome.runtime.sendMessage({ 
              action: 'checkAndPromptSave', 
              domain, 
              username: usernameInput.value, 
              password: passInput.value 
            });
          }
        }
      });
    }
  }
}, true);

function handleLoginAttempt(container) {
  const passwordInput = container.querySelector('input[type="password"]');
  
  if (passwordInput && passwordInput.value) {
    const usernameInput = container.querySelector('input[type="text"], input[type="email"], input:not([type="password"])');
    const username = usernameInput ? usernameInput.value : '';
    const password = passwordInput.value;
    const domain = window.location.hostname;

    if (username && password) {
      chrome.runtime.sendMessage({ 
        action: 'checkAndPromptSave', 
        domain, 
        username, 
        password 
      });
    }
  }
}
