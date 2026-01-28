// 認証ボタンのイベントハンドラー
document.getElementById('auth-button')?.addEventListener('click', async () => {
  const button = document.getElementById('auth-button') as HTMLButtonElement;
  button.disabled = true;
  button.textContent = '認証中...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'AUTHENTICATE' });
    if (response.success) {
      await checkAuthStatus();
    } else {
      alert(`認証に失敗しました: ${response.error}`);
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    alert('認証に失敗しました');
  } finally {
    button.disabled = false;
    button.textContent = '認証する';
  }
});

// ログアウトボタンのイベントハンドラー
document.getElementById('logout-button')?.addEventListener('click', async () => {
  const button = document.getElementById('logout-button') as HTMLButtonElement;
  button.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    if (response.success) {
      await checkAuthStatus();
    } else {
      alert(`ログアウトに失敗しました: ${response.error}`);
    }
  } catch (error) {
    console.error('Logout failed:', error);
    alert('ログアウトに失敗しました');
  } finally {
    button.disabled = false;
  }
});

// タブ一覧の読み込み
async function loadCurrentTabs(): Promise<void> {
  const tabsSection = document.getElementById('tabs-section');
  const tabsList = document.getElementById('tabs-list');
  const tabCount = document.getElementById('tab-count');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TABS' });
    if (response.success && response.tabs) {
      const tabs = response.tabs as Array<{ url: string; title: string; faviconUrl?: string; index: number }>;
      
      if (tabCount) {
        tabCount.textContent = tabs.length.toString();
      }

      if (tabsList) {
        tabsList.innerHTML = '';
        tabs.forEach((tab) => {
          const tabItem = document.createElement('div');
          tabItem.className = 'tab-item';
          
          const favicon = document.createElement('img');
          favicon.className = 'favicon';
          favicon.src = tab.faviconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';
          favicon.alt = '';
          favicon.onerror = () => {
            favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';
          };

          const tabInfo = document.createElement('div');
          tabInfo.className = 'tab-info';
          
          const tabTitle = document.createElement('div');
          tabTitle.className = 'tab-title';
          tabTitle.textContent = tab.title || tab.url;
          
          const tabUrl = document.createElement('div');
          tabUrl.className = 'tab-url';
          tabUrl.textContent = tab.url;

          tabInfo.appendChild(tabTitle);
          tabInfo.appendChild(tabUrl);
          tabItem.appendChild(favicon);
          tabItem.appendChild(tabInfo);
          tabsList.appendChild(tabItem);
        });
      }

      if (tabsSection) {
        tabsSection.style.display = 'block';
      }
    } else {
      console.error('Failed to load tabs:', response.error);
    }
  } catch (error) {
    console.error('Failed to load tabs:', error);
  }
}

// 保存フォームの送信
async function saveWorkState(event: Event): Promise<void> {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const titleInput = document.getElementById('work-title') as HTMLInputElement;
  const memoInput = document.getElementById('work-memo') as HTMLTextAreaElement;
  const saveButton = document.getElementById('save-button') as HTMLButtonElement;

  const title = titleInput.value.trim();
  const memo = memoInput.value.trim();

  // バリデーション
  if (!title) {
    showMessage('仕事名を入力してください', 'error');
    return;
  }

  // ローディング状態
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = '保存中...';
  }

  // メッセージを非表示
  const messageSection = document.getElementById('message-section');
  if (messageSection) {
    messageSection.style.display = 'none';
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_WORK_STATE',
      payload: { title, memo: memo || undefined },
    });

    if (response.success) {
      showMessage('保存しました', 'success');
      // フォームをリセット
      form.reset();
      // タブ一覧を再読み込み
      await loadCurrentTabs();
    } else {
      showMessage(`保存に失敗しました: ${response.error || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    console.error('Failed to save work state:', error);
    showMessage('保存に失敗しました', 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = '保存する';
    }
  }
}

// メッセージ表示
function showMessage(text: string, type: 'success' | 'error' | 'info'): void {
  const messageSection = document.getElementById('message-section');
  const message = document.getElementById('message');

  if (message) {
    message.textContent = text;
    message.className = `message ${type}`;
  }

  if (messageSection) {
    messageSection.style.display = 'block';
  }

  // 3秒後に自動的に非表示（成功メッセージのみ）
  if (type === 'success') {
    setTimeout(() => {
      if (messageSection) {
        messageSection.style.display = 'none';
      }
    }, 3000);
  }
}

// 認証状態に応じてUIを表示/非表示
async function updateUIForAuthStatus(isAuthenticated: boolean): Promise<void> {
  const tabsSection = document.getElementById('tabs-section');
  const saveSection = document.getElementById('save-section');

  if (isAuthenticated) {
    if (tabsSection) tabsSection.style.display = 'block';
    if (saveSection) saveSection.style.display = 'block';
    await loadCurrentTabs();
  } else {
    if (tabsSection) tabsSection.style.display = 'none';
    if (saveSection) saveSection.style.display = 'none';
  }
}

// 認証状態の確認（拡張）
async function checkAuthStatus(): Promise<void> {
  const statusElement = document.getElementById('auth-status');
  const authButton = document.getElementById('auth-button') as HTMLButtonElement;
  const logoutButton = document.getElementById('logout-button') as HTMLButtonElement;

  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
    if (response.success && response.isAuthenticated) {
      if (statusElement) {
        statusElement.textContent = '認証済み';
        statusElement.style.backgroundColor = '#e8f5e9';
      }
      if (authButton) authButton.style.display = 'none';
      if (logoutButton) logoutButton.style.display = 'block';
      await updateUIForAuthStatus(true);
    } else {
      if (statusElement) {
        statusElement.textContent = '未認証';
        statusElement.style.backgroundColor = '#fff3e0';
      }
      if (authButton) authButton.style.display = 'block';
      if (logoutButton) logoutButton.style.display = 'none';
      await updateUIForAuthStatus(false);
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    if (statusElement) {
      statusElement.textContent = 'エラーが発生しました';
      statusElement.style.backgroundColor = '#ffebee';
    }
    await updateUIForAuthStatus(false);
  }
}

// 保存フォームのイベントハンドラー
document.getElementById('save-form')?.addEventListener('submit', saveWorkState);

// メッセージリスナー
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'USER_AUTHENTICATED' || msg.type === 'USER_LOGGED_OUT') {
    checkAuthStatus();
  }
});

// 初期化
checkAuthStatus();
