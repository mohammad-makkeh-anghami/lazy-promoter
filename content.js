let addedPromoteButton = false;

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['lazy_promoter_pat_token'], function (result) {
      resolve(result.lazy_promoter_pat_token);
    });
  });
}

async function addPromoteButton() {
  // Only add button if it's not already there
  if (addedPromoteButton || document.getElementById('promote-btn')) return;

  // Check if we're on the correct repo (extra safety)
  const pathParts = window.location.pathname.split('/');
  if (pathParts[1] !== 'anghami' || pathParts[2] !== 'web-streaming-monorepo') return;

  // Check if token exists - don't add button if no token
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const btn = document.createElement('button');
  btn.id = 'promote-btn';
  btn.innerHTML = '<div>🚀</div><div>Promote</div>';
  btn.type = 'button';
  
  // Apply GitHub-style button styling
  btn.style.cssText = `
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
  
  // Add hover and active states
  btn.addEventListener('mouseenter', () => {
    btn.style.backgroundColor = 'var(--button-default-bgColor-hover)';
    btn.style.borderColor = 'var(--button-default-borderColor-hover)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.backgroundColor = 'var(--button-default-bgColor-rest)';
    btn.style.borderColor = 'var(--button-default-borderColor-rest)';
  });

  btn.onclick = async () => {
    const token = await getToken();
    if (!token) {
      alert('GitHub token not set. Click the extension icon to set it.');
      return;
    }

    // Configuration for rocket flight
    const flyOffAngle = 45; // degrees - angle between trajectory and x-axis
    
    // Get the exact position of the rocket emoji before changing button content
    const buttonRect = btn.getBoundingClientRect();
    const emojiElement = btn.querySelector('div:first-child');
    const emojiRect = emojiElement.getBoundingClientRect();

    const duration = 6000; // 2 seconds
    
    // Create flying rocket element
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

    const shakeLaunchStyle = document.createElement('style');
    shakeLaunchStyle.textContent = `
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
    document.head.appendChild(shakeLaunchStyle);
    
    document.body.appendChild(flyingRocket);
    
    // Calculate trajectory - ensure it goes off screen
    const distance = Math.max(window.innerWidth, window.innerHeight) * 1.5;
    const radians = (flyOffAngle * Math.PI) / 180;
    const deltaX = distance * Math.cos(radians);
    const deltaY = -distance * Math.sin(radians); // negative because y increases downward
    
    // Trigger the flight animation
    requestAnimationFrame(() => {
      flyingRocket.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      flyingRocket.style.animation = `shake-launch 0.6s cubic-bezier(.36,.07,.19,.97) both`;
      flyingRocket.style.animationDelay = `0.2s`;
    });
    
    // Clean up flying rocket after animation
    setTimeout(() => {
      flyingRocket.remove();
    }, duration);

    // Store original button width to prevent layout shift
    const originalWidth = btn.offsetWidth;
    btn.style.width = `${originalWidth}px`;
    
    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #666; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
    
    // Add spinner animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    const [_, owner, repo, , prNumber] = window.location.pathname.split('/');

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body: '/promote' })
      });

      if (res.ok) {
        // Show success state
        btn.innerHTML = '<div>✅</div><div>Promoted</div>';
        
        // Reset to normal state after 2 seconds
        setTimeout(() => {
          btn.innerHTML = '<div>🚀</div><div>Promote</div>';
          btn.disabled = false;
          btn.style.width = 'auto';
        }, 2 * 1000);
        
      } else {
        // Show error state
        const error = await res.json();
        btn.innerHTML = '<div>❌</div><div>Error</div>';
        alert('❌ Failed to post comment: ' + (error.message || res.status));
        
        // Reset to normal state after 3 seconds
        setTimeout(() => {
          btn.innerHTML = '<div>🚀</div><div>Promote</div>';
          btn.disabled = false;
          btn.style.width = 'auto';
        }, 3000);
      }
    } catch (error) {
      // Handle network errors
      btn.innerHTML = '<div>❌</div><div>Error</div>';
      alert('❌ Network error: ' + error.message);
      
      // Reset to normal state after 3 seconds
      setTimeout(() => {
        btn.innerHTML = '<div>🚀</div><div>Promote</div>';
        btn.disabled = false;
        btn.style.width = 'auto';
      }, 3000);
    }
  };

  // Append after the comment textarea
  toolbar.appendChild(btn);
  addedPromoteButton = true;
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  addPromoteButton();
});

// If DOM is already loaded, run immediately
if (document.readyState === 'loading') {
  // Document is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded
  addPromoteButton();
}

setInterval(() => {
  if(!addedPromoteButton) {
    addPromoteButton();
  }
}, 1000);