// Check if token exists on popup load
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['lazy_promoter_pat_token'], (result) => {
    const saveButton = document.getElementById('saveToken');
    const deleteButton = document.getElementById('deleteToken');
    const infoText = document.getElementById('infoText');
    const tokenInput = document.getElementById('tokenInput');
    const inputGroup = document.querySelector('.input-group');
    
    if (result.lazy_promoter_pat_token) {
      saveButton.textContent = 'Update Token';
      deleteButton.style.display = 'flex';
      infoText.className = 'info-text success';
      infoText.textContent = 'Token successfully added and ready to use';
      inputGroup.style.display = 'none';
    } else {
      saveButton.textContent = 'Save Token';
      deleteButton.style.display = 'none';
      infoText.className = 'info-text';
      infoText.innerHTML = 'Token with <code>repo</code> scope required for anghami/web-streaming-monorepo';
      inputGroup.style.display = 'block';
      tokenInput.placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
    }
  });
});

// Save/Update token
document.getElementById('saveToken').addEventListener('click', () => {
  const saveButton = document.getElementById('saveToken');
  const tokenInput = document.getElementById('tokenInput');
  const inputGroup = document.querySelector('.input-group');
  
  // If button says "Update Token", show input and change button text
  if (saveButton.textContent === 'Update Token') {
    inputGroup.style.display = 'block';
    saveButton.textContent = 'Save New Token';
    tokenInput.focus();
    return;
  }
  
  // If button says "Save Token" or "Save New Token", save the token
  const token = tokenInput.value.trim();
  if (!token) {
    alert('Its called lazy promoter, not too lazy to get a token. Do you want me to get it for you?');
    return;
  }

  chrome.storage.sync.set({ lazy_promoter_pat_token: token }, () => {
    const deleteButton = document.getElementById('deleteToken');
    const infoText = document.getElementById('infoText');
    
    saveButton.textContent = 'Update Token';
    deleteButton.style.display = 'flex';
    infoText.className = 'info-text success';
    infoText.textContent = 'Token successfully added and ready to use';
    tokenInput.value = '';
    inputGroup.style.display = 'none';
  });
});

// Delete token
document.getElementById('deleteToken').addEventListener('click', () => {
  if (confirm('Are you sure you want to delete the saved token?')) {
    chrome.storage.sync.remove(['lazy_promoter_pat_token'], () => {
      const saveButton = document.getElementById('saveToken');
      const deleteButton = document.getElementById('deleteToken');
      const infoText = document.getElementById('infoText');
      const tokenInput = document.getElementById('tokenInput');
      const inputGroup = document.querySelector('.input-group');
      
      saveButton.textContent = 'Save Token';
      deleteButton.style.display = 'none';
      infoText.className = 'info-text';
      infoText.innerHTML = 'Token with <code>repo</code> scope required for anghami/web-streaming-monorepo';
      tokenInput.value = '';
      tokenInput.placeholder = 'ghp_xxxxxxxxxxxxxxxxxxxx';
      inputGroup.style.display = 'block';
    });
  }
}); 