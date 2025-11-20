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

function isStreamingRepo() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[1] === 'anghami' && pathParts[2] === 'web-streaming-monorepo';
}

function isArgoCDRepo() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[1] === 'anghami' && pathParts[2] === 'argocd';
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

async function lazyApprovePR(token) {
  const { owner, repo, prNumber } = getPRInfo();
  
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event: 'APPROVE',
      body: 'Approved via Lazy Promoter'
    })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
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

// ==================== Tabbed Popover Functions ====================


function ensureTabbedPopoverStyles() {
  if (document.getElementById('tabbed-popover-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'tabbed-popover-styles';
  style.textContent = `
    .test-popover-container {
      position: relative;
      display: inline-block;
      order: 99;
    }
    
    .test-popover-menu {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      width: 400px;
      max-width: calc(100vw - 320px);
      background-color: var(--overlay-bgColor);
      border: var(--borderWidth-thin) solid var(--borderColor-default);
      border-radius: 6px;
      box-shadow: var(--shadow-extra-large);
      padding: 0;
      margin: 0;
      z-index: 1000;
      display: none;
      overflow: hidden;
    }
    
    .test-popover-menu.show {
      display: block;
    }
    
    .test-tabnav {
      background-color: var(--color-canvas-subtle);
      margin: 0;
      border-bottom: var(--borderWidth-thin) solid var(--borderColor-default);
    }
    
    .test-tabnav-tabs {
      display: flex;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .test-tabnav-wrapper {
      flex: 1;
      display: inline-flex;
    }
    
    .test-tabnav-tab {
      flex: 1;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: var(--color-fg-muted);
      cursor: pointer;
      transition: all 0.1s;
    }
    
    .test-tabnav-tab:hover {
      color: var(--color-fg-default);
    }
    
    .test-tabnav-tab[aria-selected="true"] {
      color: var(--color-fg-default);
      background-color: var(--overlay-bgColor);
      border-bottom-color: var(--color-primer-border-active);
    }
    
    .test-tabpanel {
      display: block;
    }
    
    .test-tabpanel[hidden] {
      display: none;
    }
    
    .test-tabpanel-content {
      padding: 16px;
    }
    
    .test-input-group {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    
    .test-input-wrapper {
      flex: 1;
    }
    
    .test-input-label {
      display: block;
      font-size: 12px;
      color: var(--color-fg-default);
      margin-bottom: 10px;
    }
    
    .test-input {
      width: 100%;
    }
     
    .test-run-button {
      padding: 5px 16px;
      height: 28px;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-btn-primary-text, #ffffff);
      background-color: var(--color-btn-primary-bg, #2da44e);
      border: 1px solid var(--color-btn-primary-border, #2da44e);
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
      white-space: nowrap;
      display: flex;
      align-items: center;
    }
    
    .test-run-button:hover {
      background-color: var(--color-btn-primary-hover-bg, #2c974b);
      border-color: var(--color-btn-primary-hover-border, #2c974b);
    }
    
    .test-run-button:active {
      background-color: var(--color-btn-primary-selected-bg, #298e46);
      border-color: var(--color-btn-primary-selected-border, #298e46);
    }
    
    .test-run-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
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

function createTabbedPopover() {
  ensureTabbedPopoverStyles();
  
  // GitHub's chevron down icon SVG
  const chevronSvg = '<svg class="test-dropdown-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.427 9.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 9H4.604a.25.25 0 00-.177.427z"></path></svg>';
  const originalContent = `<div style="display: inline-flex;">🧪&nbsp;&nbsp;Run tests${chevronSvg}</div>`;
  
  const container = document.createElement('div');
  container.className = 'test-popover-container';
  
  const btn = document.createElement('button');
  btn.id = 'test-dropdown-btn';
  btn.innerHTML = originalContent;
  btn.type = 'button';
  btn.style.cssText = getGitHubButtonStyle();
  addGitHubButtonHover(btn);
  
  // Create popover menu
  const popover = document.createElement('div');
  popover.className = 'test-popover-menu dropdown-menu dropdown-menu-sw p-0 overflow-hidden';
  popover.id = 'test-popover-menu';
  
  // Create tab container
  const tabContainer = document.createElement('div');
  
  // Create tabnav
  const tabnav = document.createElement('div');
  tabnav.className = 'tabnav hx_tabnav-in-dropdown color-bg-subtle m-0';
  
  const tabList = document.createElement('ul');
  tabList.className = 'tabnav-tabs d-flex';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Choose test platform');
  
  // TV Tab
  const tvTabWrapper = document.createElement('li');
  tvTabWrapper.className = 'hx_tabnav-in-dropdown-wrapper flex-1 d-inline-flex';
  tvTabWrapper.setAttribute('role', 'presentation');
  
  const tvTab = document.createElement('button');
  tvTab.id = 'tv-tab';
  tvTab.className = 'tabnav-tab flex-1';
  tvTab.setAttribute('role', 'tab');
  tvTab.setAttribute('aria-controls', 'tv-panel');
  tvTab.setAttribute('aria-selected', 'true');
  tvTab.setAttribute('tabindex', '0');
  tvTab.textContent = 'TV';
  
  tvTabWrapper.appendChild(tvTab);
  tabList.appendChild(tvTabWrapper);
  
  // Web Tab
  const webTabWrapper = document.createElement('li');
  webTabWrapper.className = 'hx_tabnav-in-dropdown-wrapper flex-1 d-inline-flex';
  webTabWrapper.setAttribute('role', 'presentation');
  
  const webTab = document.createElement('button');
  webTab.id = 'web-tab';
  webTab.className = 'tabnav-tab flex-1';
  webTab.setAttribute('role', 'tab');
  webTab.setAttribute('aria-controls', 'web-panel');
  webTab.setAttribute('aria-selected', 'false');
  webTab.setAttribute('tabindex', '-1');
  webTab.textContent = 'Web';
  
  webTabWrapper.appendChild(webTab);
  tabList.appendChild(webTabWrapper);
  
  tabnav.appendChild(tabList);
  tabContainer.appendChild(tabnav);
  
  // TV Panel
  const tvPanel = document.createElement('div');
  tvPanel.id = 'tv-panel';
  tvPanel.className = 'test-tabpanel';
  tvPanel.setAttribute('role', 'tabpanel');
  tvPanel.setAttribute('tabindex', '0');
  tvPanel.setAttribute('aria-labelledby', 'tv-tab');
  
  const tvPanelContent = document.createElement('div');
  tvPanelContent.className = 'test-tabpanel-content';
  
  const tvInputGroup = document.createElement('div');
  tvInputGroup.className = 'd-flex flex-items-end mt-2';
  tvInputGroup.style.gap = '8px';
  
  const tvInputWrapper = document.createElement('div');
  tvInputWrapper.className = 'flex-1';
  
  const tvLabel = document.createElement('label');
  tvLabel.className = 'text-bold d-block test-input-label';
  tvLabel.textContent = 'Parts to test(comma separated)';
  
  const tvInput = document.createElement('input');
  tvInput.type = 'text';
  tvInput.className = 'form-control input-monospace input-sm color-bg-subtle test-input';
  tvInput.placeholder = 'search,profiles';
  tvInput.id = 'tv-input';
  
  tvInputWrapper.appendChild(tvLabel);
  tvInputWrapper.appendChild(tvInput);
  tvInputGroup.appendChild(tvInputWrapper);
  
  const tvRunButton = document.createElement('button');
  tvRunButton.className = 'btn btn-primary btn-sm';
  tvRunButton.textContent = 'Run';
  tvRunButton.type = 'button';
  
  tvInputGroup.appendChild(tvRunButton);
  tvPanelContent.appendChild(tvInputGroup);
  tvPanel.appendChild(tvPanelContent);
  
  // Web Panel
  const webPanel = document.createElement('div');
  webPanel.id = 'web-panel';
  webPanel.className = 'test-tabpanel';
  webPanel.setAttribute('role', 'tabpanel');
  webPanel.setAttribute('tabindex', '0');
  webPanel.setAttribute('aria-labelledby', 'web-tab');
  webPanel.setAttribute('hidden', 'hidden');
  
  const webPanelContent = document.createElement('div');
  webPanelContent.className = 'test-tabpanel-content';
  
  const webInputGroup = document.createElement('div');
  webInputGroup.className = 'd-flex flex-items-end mt-2';
  webInputGroup.style.gap = '8px';
  
  const webInputWrapper = document.createElement('div');
  webInputWrapper.className = 'flex-1';
  
  const webLabel = document.createElement('label');
  webLabel.className = 'text-bold d-block test-input-label';
  webLabel.textContent = 'Parts to test(comma separated)';
  
  const webInput = document.createElement('input');
  webInput.type = 'text';
  webInput.className = 'form-control input-monospace input-sm color-bg-subtle';
  webInput.placeholder = 'search,profiles';
  webInput.id = 'web-input';
  
  webInputWrapper.appendChild(webLabel);
  webInputWrapper.appendChild(webInput);
  webInputGroup.appendChild(webInputWrapper);
  
  const webRunButton = document.createElement('button');
  webRunButton.className = 'btn btn-primary btn-sm';
  webRunButton.textContent = 'Run';
  webRunButton.type = 'button';
  
  webInputGroup.appendChild(webRunButton);
  webPanelContent.appendChild(webInputGroup);
  webPanel.appendChild(webPanelContent);
  
  tabContainer.appendChild(tvPanel);
  tabContainer.appendChild(webPanel);
  popover.appendChild(tabContainer);
  
  container.appendChild(btn);
  container.appendChild(popover);
  
  // Tab switching logic
  function switchTab(selectedTab, selectedPanel, otherTab, otherPanel) {
    selectedTab.setAttribute('aria-selected', 'true');
    selectedTab.setAttribute('tabindex', '0');
    selectedPanel.removeAttribute('hidden');
    
    otherTab.setAttribute('aria-selected', 'false');
    otherTab.setAttribute('tabindex', '-1');
    otherPanel.setAttribute('hidden', 'hidden');
  }
  
  tvTab.onclick = (e) => {
    e.stopPropagation();
    switchTab(tvTab, tvPanel, webTab, webPanel);
  };
  
  webTab.onclick = (e) => {
    e.stopPropagation();
    switchTab(webTab, webPanel, tvTab, tvPanel);
  };
  
  // Keyboard navigation
  tvTab.onkeydown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      switchTab(webTab, webPanel, tvTab, tvPanel);
      webTab.focus();
    }
  };
  
  webTab.onkeydown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      switchTab(tvTab, tvPanel, webTab, webPanel);
      tvTab.focus();
    }
  };
  
  // Toggle popover on button click
  btn.onclick = (e) => {
    e.stopPropagation();
    popover.classList.toggle('show');
  };
  
  // Close popover when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      popover.classList.remove('show');
    }
  });
  
  // Handle Run button clicks
  tvRunButton.onclick = async (e) => {
    e.stopPropagation();
    const parts = tvInput.value.trim();
    const comment = parts ? `/test-e2e tv > ${parts}` : '/test-e2e tv';
    
    popover.classList.remove('show');
    await handleButtonAction(
      btn,
      comment,
      originalContent,
      '<div>✅</div><div>Testing TV</div>'
    );
  };
  
  webRunButton.onclick = async (e) => {
    e.stopPropagation();
    const parts = webInput.value.trim();
    const comment = parts ? `/test-e2e web > ${parts}` : '/test-e2e web';
    
    popover.classList.remove('show');
    await handleButtonAction(
      btn,
      comment,
      originalContent,
      '<div>✅</div><div>Testing Web</div>'
    );
  };
  
  // Allow Enter key to trigger Run button
  tvInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tvRunButton.click();
    }
  };
  
  webInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      webRunButton.click();
    }
  };
  
  return container;
}

// ==================== Button Creation Functions ====================

async function addPromoteButton() {
  if (document.getElementById('promote-btn')) return;
  if (!isStreamingRepo()) return;
  
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
  if (!isStreamingRepo()) return;
  
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const popover = createTabbedPopover();
  toolbar.appendChild(popover);
}

async function addApproveButton() {
  if (document.getElementById('approve-btn')) return;
  if (!isArgoCDRepo()) return;
  
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const btn = document.createElement('button');
  btn.id = 'approve-btn';
  const originalContent = '<div>👍</div><div>Approve</div>';
  btn.innerHTML = originalContent;
  btn.type = 'button';
  btn.style.cssText = getGitHubButtonStyle();
  addGitHubButtonHover(btn);

  btn.onclick = async () => {
    setButtonLoading(btn, originalContent);
    try {
      await lazyApprovePR(token);
      setButtonSuccess(btn, '<div>✅</div><div>Approved</div>', originalContent);
    } catch (error) {
      setButtonError(btn, '<div>❌</div><div>Error</div>', originalContent);
      alert('❌ Failed to approve PR: ' + error.message);
    }
  };

  toolbar.appendChild(btn);
}

async function addButtons() {
  await addPromoteButton();
  await addTestDropdown();
  await addApproveButton();
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