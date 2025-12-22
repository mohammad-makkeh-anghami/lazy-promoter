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

function getRepoInfoFromPath() {
  const pathParts = window.location.pathname.split('/');
  const owner = pathParts[1];
  const repo = pathParts[2];
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function isStreamingPRListPage() {
  if (!isStreamingRepo()) return false;
  const pathParts = window.location.pathname.split('/');
  // /{owner}/{repo}/pulls (list page, not individual PR)
  return pathParts[3] === 'pulls' && !pathParts[4];
}

function isPRDetailPage() {
  // Returns true if we're on an individual PR page: /{owner}/{repo}/pull/{number}
  const pathParts = window.location.pathname.split('/');
  return pathParts[3] === 'pull' && /^\d+$/.test(pathParts[4] || '');
}

function getCurrentUserLogin() {
  const meta = document.querySelector('meta[name="user-login"]');
  const login = meta && meta.getAttribute('content');
  if (login && login.trim()) return login.trim();
  return null;
}

function getPRAuthorFromDOM() {
  // Try PR header area
  const header = document.querySelector('.gh-header-meta');
  if (header) {
    const authorAnchor =
      header.querySelector('a.author') ||
      header.querySelector('span.author > a') ||
      header.querySelector('a.Link--primary[data-hovercard-type="user"]');
    if (authorAnchor) {
      const text = (authorAnchor.textContent || '').trim();
      if (text) return text;
      const href = authorAnchor.getAttribute('href') || '';
      if (href.startsWith('/')) {
        const parts = href.split('/').filter(Boolean);
        if (parts.length > 0) return parts[0];
      }
    }
  }
  // Fallback: first timeline header author
  const timelineAuthor = document.querySelector('.timeline-comment-header-text .author');
  if (timelineAuthor && timelineAuthor.textContent) {
    return timelineAuthor.textContent.trim();
  }
  return null;
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

async function fetchPRAuthor(token) {
  const { owner, repo, prNumber } = getPRInfo();
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    method: 'GET',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) {
    return null;
  }
  const data = await res.json().catch(() => null);
  return data && data.user && data.user.login ? data.user.login : null;
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
      body: 'Approved via [Lazy Promoter](https://github.com/mohammad-makkeh-anghami/lazy-promoter)'
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

// ==================== PR Reviewability Scoring ====================

async function fetchPRReviewabilityData(owner, repo, prNumber, token, currentUserLogin) {
  const normalizedPrNumber = String(prNumber || '').trim();
  if (!normalizedPrNumber || !/^\d+$/.test(normalizedPrNumber)) {
    return {
      changedFiles: null,
      hasConflicts: null,
      descriptionStatus: null,
      ciFailed: null,
      isDraft: null,
      reviewerCount: null,
      userAlreadyReviewed: null
    };
  }

  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json'
  };

  let changedFiles = null;
  let hasConflicts = null;
  let descriptionStatus = null; // 'full', 'asana-only', or 'none'
  let ciFailed = null;
  let headSha = null;
  let isDraft = null;
  let reviewerCount = null;
  let userAlreadyReviewed = false;

  // Fetch PR details
  try {
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${normalizedPrNumber}`, {
      method: 'GET',
      headers
    });
    if (prRes.ok) {
      const prData = await prRes.json().catch(() => null);
      if (prData) {
        if (typeof prData.changed_files === 'number') {
          changedFiles = prData.changed_files;
        }
        const mergeableState = prData.mergeable_state || null;
        hasConflicts = mergeableState === 'dirty';
        headSha = prData.head && prData.head.sha ? prData.head.sha : null;
        
        // Check draft status (backup check - DOM detection should catch most)
        isDraft = prData.draft === true;
        
        // Count requested reviewers (users + teams)
        const requestedReviewers = prData.requested_reviewers || [];
        const requestedTeams = prData.requested_teams || [];
        reviewerCount = requestedReviewers.length + requestedTeams.length;
        
        // Check description status
        const body = prData.body || '';
        const trimmedBody = body.trim();
        
        if (!trimmedBody) {
          // Completely empty
          descriptionStatus = 'none';
        } else {
          // Check if it's only the Asana auto-generated text
          // Pattern: starts with optional whitespace, then ---, then Asana boilerplate
          const asanaPattern = /^\s*---\s*\n-\s*To see the specific tasks where the Asana app for GitHub is being used/;
          const bodyWithoutAsana = trimmedBody.replace(/\s*---\s*\n-\s*To see the specific tasks where the Asana app for GitHub is being used[^]*$/, '').trim();
          
          if (asanaPattern.test(trimmedBody) && !bodyWithoutAsana) {
            // Only Asana auto-text, no user description
            descriptionStatus = 'asana-only';
          } else if (bodyWithoutAsana) {
            // Has actual user content
            descriptionStatus = 'full';
          } else {
            // Fallback - treat as having description if there's any content
            descriptionStatus = 'full';
          }
        }
      }
    }
  } catch (error) {
    // Silently fail - will just skip this metric
  }

  // Fetch CI status if we have a head SHA and PR is not a draft
  // We need to check BOTH the Status API (legacy) and Checks API (GitHub Actions)
  // Skip CI checks for drafts since we'll ignore them anyway
  if (headSha && !isDraft) {
    // Check the Checks API first (GitHub Actions and modern CI)
    try {
      const checksRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`, {
        method: 'GET',
        headers
      });
      if (checksRes.ok) {
        const checksData = await checksRes.json().catch(() => null);
        if (checksData && Array.isArray(checksData.check_runs)) {
          const checkRuns = checksData.check_runs;
          // If any check run has conclusion of 'failure' or 'cancelled', CI failed
          const hasFailure = checkRuns.some(run => 
            run.conclusion === 'failure' || run.conclusion === 'cancelled'
          );
          const allComplete = checkRuns.length > 0 && checkRuns.every(run => run.status === 'completed');
          
          if (hasFailure) {
            ciFailed = true;
          } else if (allComplete && checkRuns.length > 0) {
            ciFailed = false;
          }
        }
      }
    } catch (error) {
      // Silently fail
    }

    // Also check legacy Status API if we haven't determined CI status yet
    if (ciFailed === null) {
      try {
        const statusRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/status`, {
          method: 'GET',
          headers
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json().catch(() => null);
          if (statusData && typeof statusData.state === 'string') {
            const state = statusData.state.toLowerCase();
            if (state === 'failure' || state === 'error') {
              ciFailed = true;
            } else if (state === 'success') {
              ciFailed = false;
            }
          }
        }
      } catch (error) {
        // Silently fail
      }
    }
  }

  // Check if current user has already submitted a non-dismissed, non-stale review
  // A review is stale if new commits were pushed after the review (commit_id != head SHA)
  if (currentUserLogin && !isDraft && headSha) {
    try {
      const reviewsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${normalizedPrNumber}/reviews`, {
        method: 'GET',
        headers
      });
      if (reviewsRes.ok) {
        const reviews = await reviewsRes.json().catch(() => []);
        if (Array.isArray(reviews)) {
          // Check if current user has any review that is:
          // 1. NOT dismissed
          // 2. NOT stale (commit_id matches current head SHA)
          const userReview = reviews.find(review => 
            review.user && 
            review.user.login && 
            review.user.login.toLowerCase() === currentUserLogin.toLowerCase() &&
            review.state !== 'DISMISSED' &&
            review.commit_id === headSha // Review is on the current commit (not stale)
          );
          if (userReview) {
            userAlreadyReviewed = true;
          }
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  return {
    changedFiles,
    hasConflicts,
    descriptionStatus,
    ciFailed,
    isDraft,
    reviewerCount,
    userAlreadyReviewed
  };
}

function computeReviewabilityScore(prNumber, metrics) {
  const {
    changedFiles,
    hasConflicts,
    descriptionStatus,
    ciFailed,
    isDraft,
    reviewerCount,
    userAlreadyReviewed
  } = metrics || {};

  // Skip draft PRs entirely (backup check - DOM should catch most)
  if (isDraft === true) {
    return null;
  }

  // Skip PRs the user has already reviewed (unless dismissed)
  if (userAlreadyReviewed === true) {
    return null;
  }

  let score = 10;
  const deductions = [];

  if (typeof changedFiles === 'number') {
    if (changedFiles >= 60) {
      score -= 3;
      deductions.push(`files:${changedFiles}(-3)`);
    } else if (changedFiles >= 40) {
      score -= 2;
      deductions.push(`files:${changedFiles}(-2)`);
    } else if (changedFiles >= 20) {
      score -= 1;
      deductions.push(`files:${changedFiles}(-1)`);
    }
  }

  if (hasConflicts === true) {
    score -= 3;
    deductions.push('conflicts(-3)');
  }

  // Description scoring:
  // - 'none' (completely empty): -2
  // - 'asana-only' (only auto-generated Asana text): -1
  // - 'full' (has user content): no deduction
  if (descriptionStatus === 'none') {
    score -= 2;
    deductions.push('no-desc(-2)');
  } else if (descriptionStatus === 'asana-only') {
    score -= 1;
    deductions.push('asana-only-desc(-1)');
  }

  if (ciFailed === true) {
    score -= 3;
    deductions.push('ci-failed(-3)');
  }

  // Reviewer scoring:
  // CODEOWNERS automatically adds 3 reviewers, so if <= 3, no extra reviewers were added
  if (typeof reviewerCount === 'number' && reviewerCount <= 3) {
    score -= 1;
    deductions.push(`reviewers:${reviewerCount}(-1)`);
  }

  if (score < 0) score = 0;
  if (score > 10) score = 10;

  const breakdown = deductions.length > 0 ? deductions.join(', ') : 'none';
  console.log(`[LazyPromoter] PR #${prNumber}: score=${score}/10 | deductions: ${breakdown}`);

  return score;
}

function getScoreBackgroundColor(score) {
  const clamped = Math.max(0, Math.min(10, score));
  
  // For scores < 4, use red shades
  // For scores >= 4, use green shades
  // Higher alpha = more saturated/visible
  
  if (clamped < 4) {
    // Red shades for low scores (0-3)
    // Score 0 = most red, score 3 = lighter red
    const t = clamped / 3; // 0 to 1 within the red range
    const alpha = 0.25 - (t * 0.12); // 0.25 down to 0.13
    return `rgba(208, 48, 48, ${alpha.toFixed(3)})`;
  } else {
    // Green shades for acceptable scores (4-10)
    // Score 4 = light green, score 10 = vibrant green
    const t = (clamped - 4) / 6; // 0 to 1 within the green range
    const alpha = 0.08 + (t * 0.22); // 0.08 up to 0.30
    return `rgba(46, 160, 67, ${alpha.toFixed(3)})`;
  }
}

function stylePRRowByScore(row, score) {
  if (!row) return;

  row.style.backgroundColor = getScoreBackgroundColor(score);
  row.dataset.lazyReviewScore = String(score);
  row.dataset.lazyReviewScoreProcessed = 'true';

  // Add / update small numeric badge next to the PR title.
  const existingBadge = row.querySelector('[data-lazy-review-score-badge="true"]');
  const labelText = `Reviewability Score: ${score}/10`;

  if (existingBadge) {
    existingBadge.textContent = labelText;
    return;
  }

  const titleLink = row.querySelector('a.Link--primary');
  if (!titleLink) return;

  const badge = document.createElement('span');
  badge.setAttribute('data-lazy-review-score-badge', 'true');
  badge.textContent = labelText;
  badge.style.display = 'inline-block';
  badge.style.transform = 'translateY(2px)';
  badge.style.marginLeft = '8px';
  badge.style.fontSize = '12px';
  badge.style.color = 'var(--fgColor-muted, var(--color-fg-muted, #57606a))';

  titleLink.insertAdjacentElement('afterend', badge);
}

async function annotatePRList() {
  if (!isStreamingPRListPage()) return;

  const token = await getToken();
  if (!token) return;

  const repoInfo = getRepoInfoFromPath();
  if (!repoInfo) return;

  const { owner, repo } = repoInfo;
  const currentUserLogin = getCurrentUserLogin();

  // Try multiple selectors to find PR rows
  let rows = Array.from(
    document.querySelectorAll('.js-issue-row[data-hovercard-type="pull_request"]')
  );
  
  // Fallback selectors if the first one doesn't work
  if (rows.length === 0) {
    rows = Array.from(document.querySelectorAll('[data-id][id^="issue_"]'));
  }
  
  if (rows.length === 0) {
    rows = Array.from(document.querySelectorAll('.js-issue-row'));
  }

  if (rows.length === 0) return;

  const itemsToProcess = [];

  rows.forEach((row) => {
    if (
      row.dataset.lazyReviewScoreProcessed === 'true' ||
      row.dataset.lazyReviewScoreProcessing === 'true'
    ) {
      return;
    }

    let prNumber = '';
    
    // Method 1: data-issue-number attribute
    prNumber = (row.getAttribute('data-issue-number') || '').trim();
    
    // Method 2: Look for PR link with hovercard
    if (!prNumber || !/^\d+$/.test(prNumber)) {
      const prLink = row.querySelector('a[data-hovercard-type="pull_request"]');
      if (prLink) {
        const href = prLink.getAttribute('href') || '';
        const match = href.match(/\/pull\/(\d+)/);
        if (match && match[1]) {
          prNumber = match[1];
        }
      }
    }
    
    // Method 3: Look for any link containing /pull/
    if (!prNumber || !/^\d+$/.test(prNumber)) {
      const anyPullLink = row.querySelector('a[href*="/pull/"]');
      if (anyPullLink) {
        const href = anyPullLink.getAttribute('href') || '';
        const match = href.match(/\/pull\/(\d+)/);
        if (match && match[1]) {
          prNumber = match[1];
        }
      }
    }
    
    // Method 4: Check the row's id attribute (sometimes like "issue_12345")
    if (!prNumber || !/^\d+$/.test(prNumber)) {
      const rowId = row.id || '';
      const idMatch = rowId.match(/issue_(\d+)/);
      if (idMatch && idMatch[1]) {
        prNumber = idMatch[1];
      }
    }
    
    // Skip invalid PR numbers silently
    if (!prNumber || !/^\d+$/.test(prNumber)) {
      row.dataset.lazyReviewScoreProcessed = 'true';
      row.dataset.lazyReviewScoreProcessing = 'false';
      return;
    }

    // Check if PR is a draft from DOM (to avoid API call for drafts)
    // GitHub shows a "Draft" label/badge in the PR list
    const isDraftFromDOM = !!(
      row.querySelector('.State--draft') ||
      row.querySelector('[title="Draft"]') ||
      row.querySelector('.label:not([class*="IssueLabel"])') && 
        row.textContent.includes('Draft')
    );
    
    if (isDraftFromDOM) {
      // Skip draft PRs entirely - mark as processed but don't score
      row.dataset.lazyReviewScoreProcessed = 'true';
      row.dataset.lazyReviewScoreProcessing = 'false';
      row.dataset.lazyReviewScoreDraft = 'true';
      return;
    }

    row.dataset.lazyReviewScoreProcessing = 'true';
    itemsToProcess.push({ row, prNumber });
  });

  if (!itemsToProcess.length) return;

  const batchSize = 10;
  for (let i = 0; i < itemsToProcess.length; i += batchSize) {
    const batch = itemsToProcess.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ({ row, prNumber }) => {
        try {
          const metrics = await fetchPRReviewabilityData(owner, repo, prNumber, token, currentUserLogin);
          const score = computeReviewabilityScore(prNumber, metrics);
          
          // score is null for draft PRs or PRs user already reviewed - skip styling
          if (score !== null) {
            stylePRRowByScore(row, score);
          } else {
            row.dataset.lazyReviewScoreSkipped = 'true';
          }
        } catch (error) {
          // Silently fail for individual PRs
        } finally {
          row.dataset.lazyReviewScoreProcessing = 'false';
          row.dataset.lazyReviewScoreProcessed = 'true';
        }
      })
    );
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
  if (!isPRDetailPage()) return;
  
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
  if (!isPRDetailPage()) return;
  
  const token = await getToken();
  if (!token) return;

  const toolbar = document.querySelector('.gh-header-actions');
  if (!toolbar) return; 

  const popover = createTabbedPopover();
  toolbar.appendChild(popover);
}

async function addApproveButton() {
  if (document.getElementById('approve-btn')) return;
  if (!isPRDetailPage()) return;
  
  const token = await getToken();
  if (!token) return;

  // Do not show Approve button if current user is the PR author
  const currentLogin = getCurrentUserLogin();
  let prAuthor = getPRAuthorFromDOM();
  if (!prAuthor) {
    try {
      prAuthor = await fetchPRAuthor(token);
    } catch (e) {
      // ignore and proceed; if unknown, we will show the button
    }
  }
  if (currentLogin && prAuthor && currentLogin.toLowerCase() === prAuthor.toLowerCase()) {
    return;
  }

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

async function runEnhancements() {
  try {
    await addButtons();
    await annotatePRList();
  } catch (error) {
    // Silently fail
  }
}

// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  runEnhancements();
});

// If DOM is already loaded, run immediately
if (document.readyState === 'loading') {
  // Document is still loading, wait for DOMContentLoaded
} else {
  // DOM is already loaded
  runEnhancements();
}

// GitHub navigates without full page reload, poll to handle SPA navigation
setInterval(() => {
  runEnhancements();
}, 3000);