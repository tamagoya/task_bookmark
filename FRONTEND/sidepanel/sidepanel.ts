// 認証状態の確認
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
    } else {
      if (statusElement) {
        statusElement.textContent = '未認証';
        statusElement.style.backgroundColor = '#fff3e0';
      }
      if (authButton) authButton.style.display = 'block';
      if (logoutButton) logoutButton.style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to check auth status:', error);
    if (statusElement) {
      statusElement.textContent = 'エラーが発生しました';
      statusElement.style.backgroundColor = '#ffebee';
    }
  }
}

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

// メッセージリスナー
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'USER_AUTHENTICATED' || message.type === 'USER_LOGGED_OUT') {
    checkAuthStatus();
  }
});

// 初期化
checkAuthStatus();
