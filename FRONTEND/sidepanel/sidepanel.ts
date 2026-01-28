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

// 保存済み仕事一覧の型定義
interface WorkStateListItem {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  tabCount: number;
  favicons: string[];
  memo?: string;
  isCorrupted: boolean;
}

// 日付範囲の型定義
type DateFilter = 'today' | 'thisWeek' | 'thisMonth' | 'all';

// 保存済み仕事一覧の状態
let currentWorkStates: WorkStateListItem[] = [];
let currentFilter: DateFilter = 'all';
let currentSearchQuery: string = '';

// 日付範囲を計算
function getDateRange(filter: DateFilter): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  switch (filter) {
    case 'today':
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { startDate, endDate };
    case 'thisWeek':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      return { startDate: weekStart, endDate };
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: monthStart, endDate };
    case 'all':
    default:
      // 過去30日分（デフォルト）
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      return { startDate: thirtyDaysAgo, endDate };
  }
}

// 保存済み仕事一覧の読み込み
async function loadWorkStateEvents(filter: DateFilter = 'all'): Promise<void> {
  const workStatesSection = document.getElementById('work-states-section');
  const workStatesList = document.getElementById('work-states-list');
  const workStatesLoading = document.getElementById('work-states-loading');
  const workStatesError = document.getElementById('work-states-error');
  const workStatesErrorText = document.getElementById('work-states-error-text');

  if (!workStatesSection || !workStatesList || !workStatesLoading || !workStatesError || !workStatesErrorText) {
    return;
  }

  // ローディング状態
  workStatesLoading.style.display = 'block';
  workStatesError.style.display = 'none';
  workStatesList.innerHTML = '';

  try {
    const { startDate, endDate } = getDateRange(filter);
    
    const response = await chrome.runtime.sendMessage({
      type: 'GET_WORK_STATE_EVENTS',
      payload: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    if (response.success && response.workStates) {
      currentWorkStates = response.workStates as WorkStateListItem[];
      currentFilter = filter;
      renderWorkStateList();
      workStatesLoading.style.display = 'none';
    } else {
      throw new Error(response.error || 'Failed to load work states');
    }
  } catch (error) {
    console.error('Failed to load work states:', error);
    workStatesLoading.style.display = 'none';
    workStatesError.style.display = 'block';
    workStatesErrorText.textContent = error instanceof Error ? error.message : '保存済み仕事の取得に失敗しました';
  }
}

// 検索機能
function filterWorkStatesBySearch(workStates: WorkStateListItem[], searchQuery: string): WorkStateListItem[] {
  if (!searchQuery.trim()) {
    return workStates;
  }
  const query = searchQuery.toLowerCase();
  return workStates.filter(ws => ws.title.toLowerCase().includes(query));
}

// 一覧を表示
function renderWorkStateList(): void {
  const workStatesList = document.getElementById('work-states-list');
  if (!workStatesList) {
    return;
  }

  // 検索でフィルタリング
  const filteredWorkStates = filterWorkStatesBySearch(currentWorkStates, currentSearchQuery);

  if (filteredWorkStates.length === 0) {
    workStatesList.innerHTML = '<div class="loading"><p>保存済み仕事がありません</p></div>';
    return;
  }

  workStatesList.innerHTML = '';
  filteredWorkStates.forEach((workState) => {
    const item = document.createElement('div');
    item.className = `work-state-item ${workState.isCorrupted ? 'corrupted' : ''}`;
    
    // ヘッダー（タイトルとタブ数）
    const header = document.createElement('div');
    header.className = 'work-state-header';
    
    const title = document.createElement('div');
    title.className = 'work-state-title';
    title.textContent = workState.title;
    if (workState.isCorrupted) {
      const badge = document.createElement('span');
      badge.className = 'work-state-corrupted-badge';
      badge.textContent = '破損';
      title.appendChild(badge);
    }
    
    const tabCount = document.createElement('div');
    tabCount.className = 'work-state-tab-count';
    tabCount.textContent = `${workState.tabCount}タブ`;
    
    header.appendChild(title);
    header.appendChild(tabCount);
    
    // ファビコンサムネイル
    if (workState.favicons.length > 0) {
      const favicons = document.createElement('div');
      favicons.className = 'work-state-favicons';
      workState.favicons.forEach((faviconUrl) => {
        const favicon = document.createElement('img');
        favicon.className = 'work-state-favicon';
        favicon.src = faviconUrl;
        favicon.alt = '';
        favicon.onerror = () => {
          favicon.style.display = 'none';
        };
        favicons.appendChild(favicon);
      });
      item.appendChild(favicons);
    }
    
    // メタ情報（日付、メモ）
    const meta = document.createElement('div');
    meta.className = 'work-state-meta';
    
    const date = document.createElement('div');
    date.className = 'work-state-date';
    const startDate = new Date(workState.startTime);
    const endDate = new Date(workState.endTime);
    date.textContent = `${formatDateTime(startDate)} - ${formatTime(endDate)}`;
    
    meta.appendChild(date);
    
    if (workState.memo) {
      const memo = document.createElement('div');
      memo.className = 'work-state-memo';
      memo.textContent = workState.memo;
      item.appendChild(memo);
    }
    
    // 復元ボタン
    const restoreButton = document.createElement('button');
    restoreButton.className = 'button primary restore-button';
    restoreButton.textContent = '復元';
    restoreButton.addEventListener('click', () => {
      restoreWorkState(workState.eventId);
    });
    
    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(restoreButton);
    workStatesList.appendChild(item);
  });
}

// 仕事状態を復元
async function restoreWorkState(eventId: string): Promise<void> {
  const messageSection = document.getElementById('message-section');
  const message = document.getElementById('message');
  
  if (!messageSection || !message) {
    return;
  }

  // プログレスインジケーターを表示
  showMessage('復元中...', 'info');
  messageSection.style.display = 'block';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_WORK_STATE',
      payload: { eventId },
    });

    if (response.success) {
      showMessage(`仕事状態を復元しました（${response.tabCount}タブ）`, 'success');
    } else {
      throw new Error(response.error || 'Failed to restore work state');
    }
  } catch (error) {
    console.error('Failed to restore work state:', error);
    showMessage('復元に失敗しました', 'error');
  }
}

// 日時をフォーマット
function formatDateTime(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (targetDate.getTime() === today.getTime()) {
    return `今日 ${formatTime(date)}`;
  }
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (targetDate.getTime() === yesterday.getTime()) {
    return `昨日 ${formatTime(date)}`;
  }
  
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`;
}

// 時刻をフォーマット
function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 認証状態に応じてUIを表示/非表示
async function updateUIForAuthStatus(isAuthenticated: boolean): Promise<void> {
  const tabsSection = document.getElementById('tabs-section');
  const saveSection = document.getElementById('save-section');
  const workStatesSection = document.getElementById('work-states-section');

  if (isAuthenticated) {
    if (tabsSection) tabsSection.style.display = 'block';
    if (saveSection) saveSection.style.display = 'block';
    if (workStatesSection) workStatesSection.style.display = 'block';
    await loadCurrentTabs();
    await loadWorkStateEvents('all');
  } else {
    if (tabsSection) tabsSection.style.display = 'none';
    if (saveSection) saveSection.style.display = 'none';
    if (workStatesSection) workStatesSection.style.display = 'none';
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

// 検索入力のイベントハンドラー
document.getElementById('work-states-search')?.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement;
  currentSearchQuery = input.value;
  renderWorkStateList();
});

// フィルタリングボタンのイベントハンドラー
document.querySelectorAll('.filter-button').forEach((button) => {
  button.addEventListener('click', async () => {
    const filter = (button as HTMLElement).dataset.filter as DateFilter;
    if (!filter) {
      return;
    }

    // アクティブ状態を更新
    document.querySelectorAll('.filter-button').forEach((btn) => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    // 一覧を再読み込み
    await loadWorkStateEvents(filter);
  });
});

// 再試行ボタンのイベントハンドラー
document.getElementById('work-states-retry-button')?.addEventListener('click', async () => {
  await loadWorkStateEvents(currentFilter);
});

// メッセージリスナー
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'USER_AUTHENTICATED' || msg.type === 'USER_LOGGED_OUT') {
    checkAuthStatus();
  }
  if (msg.type === 'TASK_BOOKMARK_CREATED') {
    // 新しい仕事状態が保存されたら一覧を再読み込み
    loadWorkStateEvents(currentFilter).catch(console.error);
  }
});

// 初期化
checkAuthStatus();
