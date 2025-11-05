// ==================== Utility Functions ====================

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['lazy_promoter_pat_token'], function (result) {
      resolve(result.lazy_promoter_pat_token);
    });
  });
}

function getPRInfo() {
  const [_, owner, repo, , prNumber] = window.location.pathname.split('/');
  return { owner, repo, prNumber };
}

function isCorrectRepo() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[1] === 'anghami' && pathParts[2] === 'web-streaming-monorepo';
}

// ==================== Button Styling ====================

function getGitHubButtonStyle() {
  return `
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    height: 28px;
    order: 99;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
    vertical-align: middle;
    cursor: pointer;
    user-select: none;
    border: 1px solid transparent;
    border-radius: 8px;
    appearance: none;
    color: var(--button-default-fgColor-rest);
    fill: var(--fgColor-muted);
    background-color: var(--button-default-bgColor-rest);
    border-color: var(--button-default-borderColor-rest);
    box-shadow: var(--button-default-shadow-resting),var(--button-default-shadow-inset);
  `;
}

function addGitHubButtonHover(btn) {
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = 'var(--button-default-bgColor-hover)';
    btn.style.borderColor = 'var(--button-default-borderColor-hover)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = 'var(--button-default-bgColor-rest)';
    btn.style.borderColor = 'var(--button-default-borderColor-rest)';
  });
}

// ==================== Button State Management ====================

function ensureSpinnerAnimation() {
  if (document.getElementById('spinner-animation-style')) return;
  
  const style = document.createElement('style');
  style.id = 'spinner-animation-style';
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

function setButtonLoading(btn, originalContent) {
  const originalWidth = btn.offsetWidth;
  btn.style.width = `${originalWidth}px`;
  btn.disabled = true;
  ensureSpinnerAnimation();
  btn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #666; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
  return originalWidth;
}

function setButtonSuccess(btn, successContent, originalContent, resetDelay = 2000) {
  btn.innerHTML = successContent;
  setTimeout(() => {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.style.width = 'auto';
  }, resetDelay);
}

function setButtonError(btn, errorContent, originalContent, resetDelay = 3000) {
  btn.innerHTML = errorContent;
  setTimeout(() => {
    btn.innerHTML = originalContent;
    btn.disabled = false;
    btn.style.width = 'auto';
  }, resetDelay);
}

// ==================== API Functions ====================

async function postPRComment(comment, token) {
  const { owner, repo, prNumber } = getPRInfo();
  
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body: comment })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res;
}

async function handleButtonAction(btn, comment, originalContent, successContent, onSuccess) {
  const token = await getToken();
  if (!token) {
    alert('GitHub token not set. Click the extension icon to set it.');
    return;
  }

  const originalWidth = setButtonLoading(btn, originalContent);

  try {
    await postPRComment(comment, token);
    
    if (onSuccess) {
      onSuccess();
    }
    
    setButtonSuccess(btn, successContent, originalContent);
  } catch (error) {
    setButtonError(btn, '<div>❌</div><div>Error</div>', originalContent);
    alert('❌ Failed to post comment: ' + error.message);
  }
}

// ==================== Rocket Animation ====================

function ensureShakeAnimation() {
  if (document.getElementById('shake-launch-animation-style')) return;
  
  const style = document.createElement('style');
  style.id = 'shake-launch-animation-style';
  style.textContent = `
    @keyframes shake-launch {
      10%, 90% {
        translate: -2px 0;
      }
      
      20%, 80% {
        translate: 3px 0;
      }

      30%, 50%, 70% {
        translate: -4px 0;
      }

      40%, 60% {
        translate: 4px 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function animateRocketLaunch(emojiElement) {
  const flyOffAngle = 45;
  const duration = 6000;
  
  const emojiRect = emojiElement.getBoundingClientRect();
  
  const flyingRocket = document.createElement('div');
  flyingRocket.innerHTML = '🚀';
  flyingRocket.style.cssText = `
    position: fixed;
    top: ${emojiRect.top}px;
    left: ${emojiRect.left}px;
    width: ${emojiRect.width}px;
    height: ${emojiRect.height}px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10000;
    transition: transform ${duration}ms cubic-bezier(.42,-0.34,0,1.73);
  `;

  ensureShakeAnimation();
  document.body.appendChild(flyingRocket);
  
  const distance = Math.max(window.innerWidth, window.innerHeight) * 1.5;
  const radians = (flyOffAngle * Math.PI) / 180;
  const deltaX = distance * Math.cos(radians);
  const deltaY = -distance * Math.sin(radians);
  
  requestAnimationFrame(() => {
    flyingRocket.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    flyingRocket.style.animation = `shake-launch 0.6s cubic-bezier(.36,.07,.19,.97) both`;
    flyingRocket.style.animationDelay = `0.2s`;
  });
  
  setTimeout(() => {
    flyingRocket.remove();
  }, duration);
}

// ==================== Dropdown Functions ====================

function ensureDropdownStyles() {
  if (document.getElementById('dropdown-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'dropdown-styles';
  style.textContent = `
    .test-dropdown-container {
      position: relative;
      display: inline-block;
      order: 99;
    }
    
    .test-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 200px;
      background-color: var(--overlay-bgColor);
      border: var(--borderWidth-thin) solid var(--borderColor-default);
      border-radius: 6px;
      box-shadow: var(--shadow-extra-large);
      padding: 4px 0;
      margin: 0;
      list-style: none;
      z-index: 1000;
      display: none;
    }
    
    .test-dropdown-menu.show {
      display: block;
    }

    .test-dropdown-option {
      padding: 2px 6px;
    }
    
    .test-dropdown-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      text-align: left;
      font-size: 14px;
      color: var(--color-fg-default);
      border-radius: 4px;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background-color 0.1s;
    }
    
    .test-dropdown-item:hover {
      background-color: var(--bgColor-muted) !important;
    }
    
    .test-dropdown-item:active {
      background-color: var(--bgColor-muted) !important;
    }
    
    .test-dropdown-chevron {
      display: inline-block;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      margin-left: 4px;
      fill: currentColor;
    }
  `;
  document.head.appendChild(style);
}

function createDropdownButton() {
  ensureDropdownStyles();
  
  // GitHub's chevron down icon SVG
  const chevronSvg = '<svg class="test-dropdown-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.427 9.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 9H4.604a.25.25 0 00-.177.427z"></path></svg>';
  const originalContent = `<div style="display: inline-flex;">🧪&nbsp;&nbsp;Run tests${chevronSvg}</div>`;
  
  const container = document.createElement('div');
  container.className = 'test-dropdown-container';
  
  const btn = document.createElement('button');
  btn.id = 'test-dropdown-btn';
  btn.innerHTML = originalContent;
  btn.type = 'button';
  btn.style.cssText = getGitHubButtonStyle();
  addGitHubButtonHover(btn);
  
  const menu = document.createElement('ul');
  menu.className = 'test-dropdown-menu';
  menu.id = 'test-dropdown-menu';
  
  const tvOption = document.createElement('li');
  tvOption.className = 'test-dropdown-option';
  const tvButton = document.createElement('button');
  tvButton.className = 'test-dropdown-item';
  tvButton.textContent = 'Run TV e2e tests';
  tvOption.appendChild(tvButton);
  
  const webOption = document.createElement('li');
  webOption.className = 'test-dropdown-option';
  const webButton = document.createElement('button');
  webButton.className = 'test-dropdown-item';
  webButton.textContent = 'Run Web e2e tests';
  webOption.appendChild(webButton);
  
  menu.appendChild(tvOption);
  menu.appendChild(webOption);
  
  container.appendChild(btn);
  container.appendChild(menu);
  
  // Toggle dropdown on button click
  btn.onclick = (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
  };
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      menu.classList.remove('show');
    }
  });
  
  // Handle option clicks
  
  tvButton.onclick = async (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    await handleButtonAction(
      btn,
      '/test-e2e tv',
      originalContent,
      '<div>✅</div><div>Testing TV</div>'
    );
  };
  
  webButton.onclick = async (e) => {
    e.stopPropagation();
    menu.classList.remove('show');
    await handleButtonAction(
      btn,
      '/test-e2e web',
      originalContent,
      '<div>✅</div><div>Testing Web</div>'
    );
  };
  
  return container;
}

// ==================== Button Creation Functions ====================

async function addPromoteButton() {
  if (document.getElementById('promote-btn')) return;
  if (!isCorrectRepo()) return;
  
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const btn = document.createElement('button');
  btn.id = 'promote-btn';
  const originalContent = '<div>🚀</div><div>Promote</div>';
  btn.innerHTML = originalContent;
  btn.type = 'button';
  btn.style.cssText = getGitHubButtonStyle();
  addGitHubButtonHover(btn);

  btn.onclick = async () => {
    const emojiElement = btn.querySelector('div:first-child');
    animateRocketLaunch(emojiElement);
    
    await handleButtonAction(
      btn,
      '/promote',
      originalContent,
      '<div>✅</div><div>Promoted</div>'
    );
  };

  toolbar.appendChild(btn);
}

async function addTestDropdown() {
  if (document.getElementById('test-dropdown-btn')) return;
  if (!isCorrectRepo()) return;
  
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const dropdown = createDropdownButton();
  toolbar.appendChild(dropdown);
}

async function addButtons() {
  await addPromoteButton();
  await addTestDropdown();
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  addButtons();
});

// If DOM is already loaded, run immediately
if (document.readyState === 'loading') {
  // Document is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded
  addButtons();
}

// github navigates without full page reload, so if we did not start at the pr page, the code will not find the toolbar div to add the button, and it wont trigger again when we navigate to the pr page
setInterval(() => {
  addButtons();
}, 1000);