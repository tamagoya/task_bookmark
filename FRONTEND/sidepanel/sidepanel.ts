// Bolt 9: エラーハンドリングサービスのインポート
import { ErrorHandlingService } from '../src/application/services/error-handling-service';
import { ErrorCode } from '../src/domain/value-objects/error-code';
import { ErrorCategory } from '../src/domain/value-objects/error-category';

// エラーハンドリングサービスのインスタンス
const errorHandlingService = new ErrorHandlingService();

// HTMLエスケープ関数
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 機密情報を含むURLパターンの検出
const sensitivePatterns = [
  /[?&]token=/i,
  /[?&]session=/i,
  /[?&]auth=/i,
  /[?&]api_key=/i,
  /[?&]access_token=/i,
  /[?&]password=/i,
  /[?&]secret=/i
];

function detectSensitiveUrl(url: string): boolean {
  return sensitivePatterns.some(pattern => pattern.test(url));
}

function checkSensitiveUrlsInTabs(tabs: Array<{ url: string; title: string }>): boolean {
  return tabs.some(tab => detectSensitiveUrl(tab.url));
}

// トースト通知機能
interface ToastOptions {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

class ToastManager {
  private toasts: HTMLElement[] = [];
  private container: HTMLElement;
  private maxToasts = 5;

  constructor() {
    this.container = this.createContainer();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  show(options: ToastOptions): void {
    const { message, type, duration = 3000 } = options;

    // メッセージのバリデーション
    if (!message || typeof message !== 'string') {
      console.error('Invalid toast message');
      return;
    }

    // 最大文字数の制限
    const sanitizedMessage = message.slice(0, 200);

    // 最大トースト数の制限
    if (this.toasts.length >= this.maxToasts) {
      const oldestToast = this.toasts.shift();
      if (oldestToast) {
        this.removeToast(oldestToast);
      }
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = sanitizedMessage;
    toast.setAttribute('role', 'alert');

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // アニメーションで表示
    setTimeout(() => toast.classList.add('toast-show'), 10);

    // 自動的に消える
    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => {
        this.removeToast(toast);
      }, 300);
    }, duration);
  }

  private removeToast(toast: HTMLElement): void {
    if (this.container.contains(toast)) {
      this.container.removeChild(toast);
    }
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}

const toastManager = new ToastManager();

interface DisplayTab {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  faviconUrl?: string;
  index: number;
}

let currentDisplayTabs: DisplayTab[] = [];
let selectedTabIds = new Set<number>();

const DEFAULT_FAVICON =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="%23ccc"/></svg>';

function updateTabCountDisplay(): void {
  const tabCount = document.getElementById('tab-count');
  const tabSelectedCount = document.getElementById('tab-selected-count');
  if (tabCount) {
    tabCount.textContent = currentDisplayTabs.length.toString();
  }
  if (tabSelectedCount) {
    tabSelectedCount.textContent = selectedTabIds.size.toString();
  }
}

function groupTabsByWindow(tabs: DisplayTab[]): Map<number, DisplayTab[]> {
  const groups = new Map<number, DisplayTab[]>();
  for (const tab of tabs) {
    const windowTabs = groups.get(tab.windowId) ?? [];
    windowTabs.push(tab);
    groups.set(tab.windowId, windowTabs);
  }
  return groups;
}

function getWindowLabel(windowIndex: number, tabCount: number): string {
  return `ウィンドウ ${windowIndex + 1} (${tabCount})`;
}

function updateWindowCheckboxState(windowId: number): void {
  const windowCheckbox = document.querySelector<HTMLInputElement>(
    `.window-select-checkbox[data-window-id="${windowId}"]`
  );
  if (!windowCheckbox) {
    return;
  }

  const windowTabs = currentDisplayTabs.filter((tab) => tab.windowId === windowId);
  const selectedInWindow = windowTabs.filter((tab) => selectedTabIds.has(tab.tabId)).length;

  if (selectedInWindow === 0) {
    windowCheckbox.checked = false;
    windowCheckbox.indeterminate = false;
  } else if (selectedInWindow === windowTabs.length) {
    windowCheckbox.checked = true;
    windowCheckbox.indeterminate = false;
  } else {
    windowCheckbox.checked = false;
    windowCheckbox.indeterminate = true;
  }
}

function createFaviconElement(faviconUrl?: string): HTMLImageElement {
  const favicon = document.createElement('img');
  favicon.className = 'favicon';
  favicon.src = faviconUrl || DEFAULT_FAVICON;
  favicon.alt = '';
  favicon.onerror = () => {
    favicon.src = DEFAULT_FAVICON;
  };
  return favicon;
}

function createTabItemElement(tab: DisplayTab): HTMLElement {
  const tabItem = document.createElement('div');
  tabItem.className = 'tab-item';
  if (!selectedTabIds.has(tab.tabId)) {
    tabItem.classList.add('tab-item-unselected');
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'tab-select-checkbox';
  checkbox.checked = selectedTabIds.has(tab.tabId);
  checkbox.setAttribute('data-tab-id', tab.tabId.toString());
  checkbox.setAttribute('aria-label', `${tab.title} を保存対象に含める`);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      selectedTabIds.add(tab.tabId);
      tabItem.classList.remove('tab-item-unselected');
    } else {
      selectedTabIds.delete(tab.tabId);
      tabItem.classList.add('tab-item-unselected');
    }
    updateTabCountDisplay();
    updateWindowCheckboxState(tab.windowId);
  });

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
  tabItem.appendChild(checkbox);
  tabItem.appendChild(createFaviconElement(tab.faviconUrl));
  tabItem.appendChild(tabInfo);

  return tabItem;
}

function renderTabsList(): void {
  const tabsList = document.getElementById('tabs-list');
  if (!tabsList) {
    return;
  }

  while (tabsList.firstChild) {
    tabsList.removeChild(tabsList.firstChild);
  }

  if (currentDisplayTabs.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'tab-item';
    emptyMessage.textContent = '開いているタブがありません';
    tabsList.appendChild(emptyMessage);
    updateTabCountDisplay();
    return;
  }

  const windowGroups = groupTabsByWindow(currentDisplayTabs);
  const sortedWindowIds = [...windowGroups.keys()].sort((a, b) => a - b);

  sortedWindowIds.forEach((windowId, windowIndex) => {
    const windowTabs = windowGroups.get(windowId) ?? [];
    const windowGroup = document.createElement('div');
    windowGroup.className = 'window-group';

    const windowHeader = document.createElement('div');
    windowHeader.className = 'window-group-header';

    const windowCheckbox = document.createElement('input');
    windowCheckbox.type = 'checkbox';
    windowCheckbox.className = 'window-select-checkbox';
    windowCheckbox.setAttribute('data-window-id', windowId.toString());
    windowCheckbox.setAttribute(
      'aria-label',
      `${getWindowLabel(windowIndex, windowTabs.length)} を一括選択`
    );

    const selectedInWindow = windowTabs.filter((tab) => selectedTabIds.has(tab.tabId)).length;
    windowCheckbox.checked = selectedInWindow === windowTabs.length && windowTabs.length > 0;
    windowCheckbox.indeterminate =
      selectedInWindow > 0 && selectedInWindow < windowTabs.length;

    windowCheckbox.addEventListener('change', () => {
      if (windowCheckbox.checked) {
        windowTabs.forEach((tab) => selectedTabIds.add(tab.tabId));
      } else {
        windowTabs.forEach((tab) => selectedTabIds.delete(tab.tabId));
      }
      renderTabsList();
    });

    const windowTitle = document.createElement('span');
    windowTitle.className = 'window-group-title';
    windowTitle.textContent = getWindowLabel(windowIndex, windowTabs.length);

    windowHeader.appendChild(windowCheckbox);
    windowHeader.appendChild(windowTitle);
    windowGroup.appendChild(windowHeader);

    windowTabs.forEach((tab) => {
      windowGroup.appendChild(createTabItemElement(tab));
    });

    tabsList.appendChild(windowGroup);
  });

  updateTabCountDisplay();
}

function mergeTabSelection(
  tabs: DisplayTab[],
  previousSelection: Set<number>,
  preserveSelection: boolean
): Set<number> {
  const nextSelection = new Set<number>();
  const previousTabIds = new Set(currentDisplayTabs.map((tab) => tab.tabId));

  if (!preserveSelection || currentDisplayTabs.length === 0) {
    tabs.forEach((tab) => nextSelection.add(tab.tabId));
    return nextSelection;
  }

  for (const tab of tabs) {
    const existedBefore = previousTabIds.has(tab.tabId);
    if (!existedBefore || previousSelection.has(tab.tabId)) {
      nextSelection.add(tab.tabId);
    }
  }

  return nextSelection;
}

function getSelectedTabsForSave(): DisplayTab[] {
  return currentDisplayTabs.filter((tab) => selectedTabIds.has(tab.tabId));
}

// プログレスバーの更新
function updateRestoreProgress(current: number, total: number): void {
  const progressContainer = document.getElementById('restore-progress');
  const progressBar = document.getElementById('restore-progress-bar') as HTMLProgressElement;
  const progressText = document.querySelector('.progress-text');

  if (progressContainer && progressBar && progressText) {
    progressContainer.style.display = 'block';
    progressBar.max = total;
    progressBar.value = current;
    progressText.textContent = `${current} / ${total}`;

    // 完了時に自動的に非表示
    if (current === total && total > 0) {
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 1000);
    }
  }
}

function hideRestoreProgress(): void {
  const progressContainer = document.getElementById('restore-progress');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
}

// ローディング状態のボタン
function showButtonLoading(button: HTMLButtonElement): void {
  button.classList.add('loading');
  button.disabled = true;
  button.dataset.originalText = button.textContent || '';
}

function hideButtonLoading(button: HTMLButtonElement, text?: string): void {
  button.classList.remove('loading');
  button.disabled = false;
  button.textContent = text || button.dataset.originalText || '';
  delete button.dataset.originalText;
}

// モーダル内にエラーメッセージを表示
function showModalError(message: string, severity: 'error' | 'warning' | 'info' = 'error'): void {
  const errorElement = document.getElementById('url-edit-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.className = `modal-error-message ${severity}`;
    errorElement.style.display = 'block';
    
    // 警告やエラーの場合は3秒後に自動的に非表示
    if (severity === 'error' || severity === 'warning') {
      setTimeout(() => {
        errorElement.style.display = 'none';
      }, 3000);
    }
  }
}

// Bolt 9: ErrorCodeからエラーメッセージを生成してモーダルに表示
function showModalErrorFromCode(errorCode: ErrorCode, context?: Record<string, unknown>): void {
  const errorMessage = errorHandlingService.generateUserMessage(errorCode, context);
  const classification = errorHandlingService.classifyError(errorCode);
  
  // 重要度に応じて表示スタイルを変更
  const severity = classification.severity === 'CRITICAL' ? 'error' : 
                   classification.severity === 'ERROR' ? 'error' : 
                   classification.severity === 'WARNING' ? 'warning' : 'info';
  
  showModalError(errorMessage.message, severity);
}

// モーダル内のエラーメッセージをクリア
function clearModalError(): void {
  const errorElement = document.getElementById('url-edit-error');
  if (errorElement) {
    errorElement.style.display = 'none';
    errorElement.textContent = '';
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
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      showMessageFromErrorCode(errorCode, { operation: '認証' });
    }
  } catch (error) {
    console.error('Authentication failed:', error);
    // Bolt 9: ErrorHandlingServiceを使用
    const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
    showMessageFromErrorCode(errorCode, { operation: '認証' });
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
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
      showMessageFromErrorCode(errorCode, { operation: 'ログアウト' });
    }
  } catch (error) {
    console.error('Logout failed:', error);
    // Bolt 9: ErrorHandlingServiceを使用
    const errorCode = ErrorCode.create('AUTH_FAILED', ErrorCategory.AUTHENTICATION);
    showMessageFromErrorCode(errorCode, { operation: 'ログアウト' });
  } finally {
    button.disabled = false;
  }
});

// タブ一覧の読み込み
async function loadCurrentTabs(options?: { preserveSelection?: boolean }): Promise<void> {
  const tabsSection = document.getElementById('tabs-section');
  const refreshButton = document.getElementById('refresh-tabs-button') as HTMLButtonElement | null;
  const previousSelection = options?.preserveSelection ? new Set(selectedTabIds) : new Set<number>();

  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.classList.add('loading');
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TABS' });
    if (response.success && response.tabs) {
      const tabs = response.tabs as DisplayTab[];
      currentDisplayTabs = tabs;
      selectedTabIds = mergeTabSelection(
        tabs,
        previousSelection,
        options?.preserveSelection === true
      );
      renderTabsList();

      if (tabsSection) {
        tabsSection.style.display = 'block';
      }
    } else {
      console.error('Failed to load tabs:', response.error);
      toastManager.show({
        message: 'タブ一覧の取得に失敗しました',
        type: 'error',
      });
    }
  } catch (error) {
    console.error('Failed to load tabs:', error);
    toastManager.show({
      message: 'タブ一覧の取得に失敗しました',
      type: 'error',
    });
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.classList.remove('loading');
    }
  }
}

document.getElementById('refresh-tabs-button')?.addEventListener('click', async () => {
  await loadCurrentTabs({ preserveSelection: true });
});

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
    // Bolt 9: ErrorHandlingServiceを使用
    const errorCode = ErrorCode.create('MISSING_REQUIRED_FIELD', ErrorCategory.VALIDATION);
    showMessageFromErrorCode(errorCode);
    return;
  }

  const selectedTabs = getSelectedTabsForSave();
  if (selectedTabs.length === 0) {
    showMessage('保存するタブを1つ以上選択してください', 'warning');
    return;
  }

  // 機密情報を含むURLの警告
  try {
    if (checkSensitiveUrlsInTabs(selectedTabs)) {
        const confirmed = confirm(
          '警告: 選択したタブには、機密情報（トークン、パスワードなど）を含む可能性のあるURLがあります。\n\n' +
          'これらのURLはGoogleカレンダーに保存されます。\n' +
          '保存後にURL編集機能で削除または編集することもできます。\n\n' +
          '本当に保存しますか？'
        );
        if (!confirmed) {
          if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '保存する';
          }
          return;
        }
    }
  } catch (error) {
    console.error('Failed to check sensitive URLs:', error);
    // URLチェックの失敗は保存をブロックしない
  }

  // ローディング状態
  if (saveButton) {
    showButtonLoading(saveButton);
  }

  // メッセージを非表示
  const messageSection = document.getElementById('message-section');
  if (messageSection) {
    messageSection.style.display = 'none';
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_WORK_STATE',
      payload: {
        title,
        memo: memo || undefined,
        selectedTabIds: [...selectedTabIds],
      },
    });

    if (response.success) {
      showMessage('保存しました', 'success');
      // フォームをリセット
      form.reset();
      // 復元セッション表示をクリア（ストレージは service-worker でクリア済み）
      await applyLastRestoredSession();
      // タブ一覧を再読み込み
      await loadCurrentTabs();
    } else {
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('API_ERROR', ErrorCategory.API);
      showMessageFromErrorCode(errorCode, { operation: '保存' });
    }
  } catch (error) {
    console.error('Failed to save work state:', error);
    // Bolt 9: ErrorHandlingServiceを使用（ネットワークエラーの可能性）
    const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
    showMessageFromErrorCode(errorCode, { operation: '保存' });
  } finally {
    if (saveButton) {
      hideButtonLoading(saveButton, '保存する');
    }
  }
}

// メッセージ表示
function showMessage(text: string, type: 'success' | 'error' | 'info' | 'warning'): void {
  // トースト通知を表示
  toastManager.show({ message: text, type });

  // 既存のメッセージセクションも表示
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

// Bolt 9: ErrorCodeからエラーメッセージを生成して表示
function showMessageFromErrorCode(errorCode: ErrorCode, context?: Record<string, unknown>): void {
  const errorMessage = errorHandlingService.generateUserMessage(errorCode, context);
  const classification = errorHandlingService.classifyError(errorCode);
  
  // 重要度に応じて表示タイプを変更
  const type = classification.severity === 'CRITICAL' ? 'error' : 
               classification.severity === 'ERROR' ? 'error' : 
               classification.severity === 'WARNING' ? 'warning' : 'info';
  
  showMessage(errorMessage.message, type);
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
  hasRestoredFrom?: boolean; // 復元元があるか（別の仕事から派生した）（Bolt 7）
  hasRestoredTo?: boolean;   // 復元先があるか（この仕事から派生した）（Bolt 7）
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
    // 前後関係インジケーター（Bolt 7）
    // 復元元がある場合（別の仕事から派生した）
    if (workState.hasRestoredFrom) {
      const indicator = document.createElement('span');
      indicator.className = 'restore-relation-indicator restored-from';
      indicator.setAttribute('aria-label', '復元元あり');
      indicator.textContent = '⬆';
      indicator.setAttribute('data-tooltip', '別の仕事から復元');
      title.appendChild(indicator);
    }
    // 復元先がある場合（この仕事から派生した）
    if (workState.hasRestoredTo) {
      const indicator = document.createElement('span');
      indicator.className = 'restore-relation-indicator restored-to';
      indicator.setAttribute('aria-label', '復元先あり');
      indicator.textContent = '⬇';
      indicator.setAttribute('data-tooltip', '別の仕事へ復元済み');
      title.appendChild(indicator);
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
    
    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'work-state-buttons';
    
    // 編集ボタン（Bolt 8）
    const editButton = document.createElement('button');
    editButton.className = 'button secondary edit-button';
    editButton.textContent = '編集';
    editButton.addEventListener('click', () => {
      showUrlEditModal(workState.eventId, workState.title);
    });
    
    // 復元ボタン
    const restoreButton = document.createElement('button');
    restoreButton.className = 'button primary restore-button';
    restoreButton.textContent = '復元';
    restoreButton.addEventListener('click', () => {
      restoreWorkState(workState.eventId);
    });
    
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(restoreButton);
    
    item.appendChild(header);
    item.appendChild(meta);
    item.appendChild(buttonContainer);
    workStatesList.appendChild(item);
  });
}

// 仕事状態を復元
async function restoreWorkState(eventId: string): Promise<void> {
  try {
    // プログレスバーを表示
    showMessage('復元中...', 'info');

    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_WORK_STATE',
      payload: { eventId },
    });

    if (response.success) {
      const tabCount = response.tabCount || 0;

      // プログレスバーを更新（簡易的に即座に100%にする）
      updateRestoreProgress(tabCount, tabCount);

      showMessage(`仕事状態を復元しました（${tabCount}タブ）`, 'success');
    } else {
      hideRestoreProgress();
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('API_ERROR', ErrorCategory.API);
      showMessageFromErrorCode(errorCode, { operation: '復元' });
    }
  } catch (error) {
    console.error('Failed to restore work state:', error);
    hideRestoreProgress();
    // Bolt 9: ErrorHandlingServiceを使用（ネットワークエラーの可能性）
    const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
    showMessageFromErrorCode(errorCode, { operation: '復元' });
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

// 復元セッション情報を読み取り、保存フォームの初期値と復元時刻表示を更新
async function applyLastRestoredSession(): Promise<void> {
  const keys = ['lastRestoredEventId', 'lastRestoredAtTime', 'lastRestoredWorkTitle'] as const;
  const stored = await chrome.storage.local.get(keys);
  const titleInput = document.getElementById('work-title') as HTMLInputElement | null;
  const restoredAtEl = document.getElementById('restored-at-display');

  const hasSession =
    stored.lastRestoredAtTime != null && String(stored.lastRestoredAtTime).trim() !== '';

  if (titleInput) {
    if (hasSession && stored.lastRestoredWorkTitle != null) {
      titleInput.value = String(stored.lastRestoredWorkTitle).slice(0, 200);
    } else {
      titleInput.value = '';
    }
  }

  if (restoredAtEl) {
    if (hasSession && stored.lastRestoredAtTime) {
      try {
        const date = new Date(stored.lastRestoredAtTime as string);
        const formatted =
          isNaN(date.getTime()) ? String(stored.lastRestoredAtTime) : formatRestoredAt(date);
        restoredAtEl.textContent = `復元した時刻: ${formatted}`;
        restoredAtEl.style.display = 'block';
      } catch {
        restoredAtEl.textContent = '';
        restoredAtEl.style.display = 'none';
      }
    } else {
      restoredAtEl.textContent = '';
      restoredAtEl.style.display = 'none';
    }
  }
}

function formatRestoredAt(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

// 認証状態に応じてUIを表示/非表示
async function updateUIForAuthStatus(isAuthenticated: boolean): Promise<void> {
  const tabsSection = document.getElementById('tabs-section');
  const saveSection = document.getElementById('save-section');
  const workStatesSection = document.getElementById('work-states-section');

  const ignoreRulesSection = document.getElementById('ignore-rules-section');

  if (isAuthenticated) {
    if (tabsSection) tabsSection.style.display = 'block';
    if (saveSection) saveSection.style.display = 'block';
    if (workStatesSection) workStatesSection.style.display = 'block';
    if (ignoreRulesSection) ignoreRulesSection.style.display = 'block';
    await loadCurrentTabs();
    await applyLastRestoredSession();
    await loadWorkStateEvents('all');
    await loadIgnoreRules();
  } else {
    if (tabsSection) tabsSection.style.display = 'none';
    if (saveSection) saveSection.style.display = 'none';
    if (workStatesSection) workStatesSection.style.display = 'none';
    if (ignoreRulesSection) ignoreRulesSection.style.display = 'none';
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

// 復元セッション情報の変更を購読（他タブやカレンダーから復元した場合に保存フォームを更新）
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const restoreKeys = ['lastRestoredEventId', 'lastRestoredAtTime', 'lastRestoredWorkTitle'];
  const hasRestoreChange = restoreKeys.some((k) => changes[k] != null);
  if (hasRestoreChange) {
    applyLastRestoredSession().catch(console.error);
  }
});

// URL編集モーダルの状態
let currentEditEventId: string | null = null;
let currentEditTabs: Array<{ url: string; title: string; faviconUrl?: string; index: number }> = [];

// URL編集モーダルを表示（Bolt 8）
async function showUrlEditModal(eventId: string, title: string): Promise<void> {
  const modal = document.getElementById('url-edit-modal');
  const modalTitle = document.getElementById('url-edit-title');
  const tabsList = document.getElementById('url-edit-tabs-list');
  
  if (!modal || !modalTitle || !tabsList) {
    return;
  }

  currentEditEventId = eventId;
  modalTitle.textContent = `URL編集: ${title}`;
  
  // 現在のタブ情報を取得
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_WORK_STATE_DETAIL',
      payload: { eventId },
    });

    if (response.success && response.workState) {
      currentEditTabs = response.workState.tabs || [];
      renderUrlEditTabsList();
      clearModalError(); // エラーをクリア
      modal.style.display = 'block';
    } else {
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('API_ERROR', ErrorCategory.API);
      showMessageFromErrorCode(errorCode, { operation: '詳細情報の取得' });
    }
  } catch (error) {
    console.error('Failed to load work state detail:', error);
    // Bolt 9: ErrorHandlingServiceを使用（ネットワークエラーの可能性）
    const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
    showMessageFromErrorCode(errorCode, { operation: '詳細情報の取得' });
  }
}

// URL編集タブリストを表示（Bolt 8）
function renderUrlEditTabsList(): void {
  const tabsList = document.getElementById('url-edit-tabs-list');
  if (!tabsList) {
    return;
  }

  tabsList.innerHTML = '';
  
  currentEditTabs.forEach((tab, index) => {
    const tabItem = document.createElement('div');
    tabItem.className = 'url-edit-tab-item';
    tabItem.setAttribute('data-index', index.toString());
    
    // 順序変更ボタン
    const orderButtons = document.createElement('div');
    orderButtons.className = 'url-edit-order-buttons';
    
    const moveUpButton = document.createElement('button');
    moveUpButton.className = 'url-edit-order-button';
    moveUpButton.textContent = '↑';
    moveUpButton.disabled = index === 0;
    moveUpButton.addEventListener('click', () => {
      if (index > 0) {
        moveTab(index, index - 1);
      }
    });
    
    const moveDownButton = document.createElement('button');
    moveDownButton.className = 'url-edit-order-button';
    moveDownButton.textContent = '↓';
    moveDownButton.disabled = index === currentEditTabs.length - 1;
    moveDownButton.addEventListener('click', () => {
      if (index < currentEditTabs.length - 1) {
        moveTab(index, index + 1);
      }
    });
    
    orderButtons.appendChild(moveUpButton);
    orderButtons.appendChild(moveDownButton);
    
    // URL情報
    const tabInfo = document.createElement('div');
    tabInfo.className = 'url-edit-tab-info';
    
    // HTMLを使って入力フィールドを作成
    const escapedUrl = escapeHtml(tab.url);
    const escapedTitle = escapeHtml(tab.title || '');
    tabInfo.innerHTML = `
      <input type="text" class="url-edit-input" value="${escapedUrl}" placeholder="URL" data-field="url" data-index="${index}">
      <input type="text" class="url-edit-input" value="${escapedTitle}" placeholder="ページタイトル（任意）" data-field="title" data-index="${index}">
    `;
    
    // イベントリスナーを追加
    const urlInput = tabInfo.querySelector('input[data-field="url"]') as HTMLInputElement;
    const titleInput = tabInfo.querySelector('input[data-field="title"]') as HTMLInputElement;
    
    urlInput?.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const idx = parseInt(input.getAttribute('data-index') || '0', 10);
      currentEditTabs[idx].url = input.value;
    });
    
    titleInput?.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const idx = parseInt(input.getAttribute('data-index') || '0', 10);
      currentEditTabs[idx].title = input.value;
    });
    
    // 削除ボタン
    const deleteButton = document.createElement('button');
    deleteButton.className = 'button secondary url-edit-delete-button';
    deleteButton.textContent = '削除';
    deleteButton.disabled = currentEditTabs.length === 1; // 最後の1つは削除不可
    deleteButton.addEventListener('click', () => {
      if (currentEditTabs.length > 1) {
        removeTabFromEdit(index);
      } else {
        // Bolt 9: ErrorHandlingServiceを使用
        const errorCode = ErrorCode.create('VALIDATION_ERROR', ErrorCategory.VALIDATION);
        const errorMessage = errorHandlingService.generateUserMessage(errorCode);
        // errorMessageは汎用メッセージなので、具体的なメッセージを使用
        void errorMessage;
        showModalError('最後の1つのタブは削除できません', 'warning');
      }
    });
    
    tabItem.appendChild(orderButtons);
    tabItem.appendChild(tabInfo);
    tabItem.appendChild(deleteButton);
    tabsList.appendChild(tabItem);
  });
}

// タブを移動（Bolt 8）
function moveTab(fromIndex: number, toIndex: number): void {
  const tab = currentEditTabs[fromIndex];
  currentEditTabs.splice(fromIndex, 1);
  currentEditTabs.splice(toIndex, 0, tab);
  
  // インデックスを再計算
  currentEditTabs = currentEditTabs.map((t, i) => ({
    ...t,
    index: i,
  }));
  
  renderUrlEditTabsList();
}

// タブを削除（Bolt 8）
function removeTabFromEdit(index: number): void {
  if (currentEditTabs.length <= 1) {
    // Bolt 9: ErrorHandlingServiceを使用
    showModalError('最後の1つのタブは削除できません', 'warning');
    return;
  }
  
  currentEditTabs.splice(index, 1);
  
  // インデックスを再計算
  currentEditTabs = currentEditTabs.map((t, i) => ({
    ...t,
    index: i,
  }));
  
  renderUrlEditTabsList();
}

// 新しいタブを追加（Bolt 8）
function addTabToEdit(url: string, title: string): void {
  if (!url.trim()) {
    // Bolt 9: ErrorHandlingServiceを使用
    const errorCode = ErrorCode.create('MISSING_REQUIRED_FIELD', ErrorCategory.VALIDATION);
    showModalErrorFromCode(errorCode);
    return;
  }

  const newTab = {
    url: url.trim(),
    title: title.trim() || url.trim(),
    index: currentEditTabs.length,
  };
  
  currentEditTabs.push(newTab);
  
  // インデックスを再計算
  currentEditTabs = currentEditTabs.map((t, i) => ({
    ...t,
    index: i,
  }));
  
  renderUrlEditTabsList();
  
  // 入力欄をクリア
  const urlInput = document.getElementById('url-edit-new-url') as HTMLInputElement;
  const titleInput = document.getElementById('url-edit-new-title') as HTMLInputElement;
  if (urlInput) urlInput.value = '';
  if (titleInput) titleInput.value = '';
}

// URL編集を保存（Bolt 8）
async function saveUrlEdit(): Promise<void> {
  if (!currentEditEventId) {
    return;
  }

  if (currentEditTabs.length === 0) {
    // Bolt 9: ErrorHandlingServiceを使用
    const errorCode = ErrorCode.create('VALIDATION_ERROR', ErrorCategory.VALIDATION);
    showModalErrorFromCode(errorCode);
    return;
  }

  // バリデーション: URLが有効かチェック
  for (const tab of currentEditTabs) {
    if (!tab.url || !tab.url.trim()) {
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('MISSING_REQUIRED_FIELD', ErrorCategory.VALIDATION);
      showModalErrorFromCode(errorCode);
      return;
    }
  }

  const saveButton = document.getElementById('url-edit-save') as HTMLButtonElement;
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = '保存中...';
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_WORK_STATE_TABS',
      payload: {
        eventId: currentEditEventId,
        newTabs: currentEditTabs.map(tab => ({
          url: tab.url,
          title: tab.title || tab.url,
          faviconUrl: tab.faviconUrl,
          index: tab.index,
        })),
      },
    });

    if (response.success) {
      showMessage('URLを更新しました', 'success');
      closeUrlEditModal();
      // 一覧を再読み込み
      await loadWorkStateEvents(currentFilter);
    } else {
      // Bolt 9: ErrorHandlingServiceを使用
      const errorCode = ErrorCode.create('API_ERROR', ErrorCategory.API);
      showModalErrorFromCode(errorCode, { operation: '更新' });
    }
  } catch (error) {
    console.error('Failed to save URL edit:', error);
    // Bolt 9: ErrorHandlingServiceを使用（ネットワークエラーの可能性）
    const errorCode = ErrorCode.create('NETWORK_ERROR', ErrorCategory.NETWORK);
    showModalErrorFromCode(errorCode, { operation: '更新' });
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = '保存';
    }
  }
}

// URL編集モーダルを閉じる（Bolt 8）
function closeUrlEditModal(): void {
  const modal = document.getElementById('url-edit-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  currentEditEventId = null;
  currentEditTabs = [];
  clearModalError(); // エラーをクリア
}

// URL編集モーダルのイベントハンドラー（Bolt 8）
document.getElementById('url-edit-close')?.addEventListener('click', closeUrlEditModal);
document.getElementById('url-edit-cancel')?.addEventListener('click', closeUrlEditModal);
document.getElementById('url-edit-save')?.addEventListener('click', saveUrlEdit);
document.getElementById('url-edit-add-button')?.addEventListener('click', () => {
  const urlInput = document.getElementById('url-edit-new-url') as HTMLInputElement;
  const titleInput = document.getElementById('url-edit-new-title') as HTMLInputElement;
  if (urlInput && titleInput) {
    addTabToEdit(urlInput.value, titleInput.value);
  }
});

// Enterキーで追加
document.getElementById('url-edit-new-url')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const urlInput = document.getElementById('url-edit-new-url') as HTMLInputElement;
    const titleInput = document.getElementById('url-edit-new-title') as HTMLInputElement;
    if (urlInput && titleInput) {
      addTabToEdit(urlInput.value, titleInput.value);
    }
  }
});

// Bolt 9: キーボードショートカット
document.addEventListener('keydown', (e) => {
  // Ctrl+S / Cmd+S: 保存フォームがある場合に保存を実行
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const saveButton = document.getElementById('save-button') as HTMLButtonElement;
    if (saveButton && saveButton.style.display !== 'none' && !saveButton.disabled) {
      saveButton.click();
    }
  }
  
  // Esc: モーダルを閉じる
  if (e.key === 'Escape') {
    const modal = document.getElementById('url-edit-modal');
    if (modal && modal.style.display !== 'none') {
      closeUrlEditModal();
    }
  }
  
  // Ctrl+/ / Cmd+/: 検索フィールドにフォーカス
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    const searchInput = document.getElementById('work-states-search') as HTMLInputElement;
    if (searchInput && searchInput.style.display !== 'none') {
      searchInput.focus();
    }
  }
});

// ============================================================
// Unit-7: 無視URL設定（Ignore URL Rules）
// ============================================================

interface IgnoreRuleDto {
  id: string;
  pattern: string;
  ignoreOnSave: boolean;
  ignoreOnClose: boolean;
  ignoreOnRestore: boolean;
  label?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

let ignoreRulesCache: IgnoreRuleDto[] = [];

async function loadIgnoreRules(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_IGNORE_RULES' });
    if (response?.success && Array.isArray(response.rules)) {
      ignoreRulesCache = response.rules as IgnoreRuleDto[];
      renderIgnoreRulesList();
    } else {
      ignoreRulesCache = [];
      renderIgnoreRulesList();
      const message = response?.error || '無視URLルールの取得に失敗しました';
      showIgnoreRuleError(message);
    }
  } catch (error) {
    console.error('Failed to load ignore rules', error);
    ignoreRulesCache = [];
    renderIgnoreRulesList();
    showIgnoreRuleError('無視URLルールの取得に失敗しました');
  }
}

function renderIgnoreRulesList(): void {
  const list = document.getElementById('ignore-rules-list');
  const countLabel = document.getElementById('ignore-rules-count');
  if (!list) return;

  // 既存子要素をクリア
  list.replaceChildren();

  if (countLabel) {
    countLabel.textContent = `${ignoreRulesCache.length}件`;
  }

  if (ignoreRulesCache.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'ignore-rules-empty';
    empty.textContent = 'まだ無視URLルールはありません。上のフォームから追加してください。';
    list.appendChild(empty);
    return;
  }

  // 並び順: 作成日時降順
  const sorted = [...ignoreRulesCache].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  for (const rule of sorted) {
    list.appendChild(buildIgnoreRuleItem(rule));
  }
}

function buildIgnoreRuleItem(rule: IgnoreRuleDto): HTMLLIElement {
  const item = document.createElement('li');
  item.className = 'ignore-rule-item';
  if (!rule.enabled) item.classList.add('disabled');
  item.dataset.ruleId = rule.id;

  const header = document.createElement('div');
  header.className = 'ignore-rule-item-header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'ignore-rule-item-title';

  const labelEl = document.createElement('span');
  labelEl.className = 'ignore-rule-item-label';
  labelEl.textContent = rule.label && rule.label.length > 0
    ? rule.label
    : rule.pattern;
  titleBlock.appendChild(labelEl);

  const patternEl = document.createElement('span');
  patternEl.className = 'ignore-rule-item-pattern';
  patternEl.textContent = rule.pattern;
  titleBlock.appendChild(patternEl);

  header.appendChild(titleBlock);

  const toggleWrap = document.createElement('label');
  toggleWrap.className = 'ignore-rule-item-toggle';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = rule.enabled;
  toggle.setAttribute('aria-label', '有効/無効を切替');
  toggle.addEventListener('change', () => {
    void onToggleIgnoreRule(rule.id, toggle.checked);
  });
  toggleWrap.appendChild(toggle);
  header.appendChild(toggleWrap);

  item.appendChild(header);

  const flags = document.createElement('div');
  flags.className = 'ignore-rule-item-flags';
  if (rule.ignoreOnSave) {
    const chip = document.createElement('span');
    chip.className = 'ignore-rule-flag-chip flag-save';
    chip.textContent = '保存しない';
    flags.appendChild(chip);
  }
  if (rule.ignoreOnClose) {
    const chip = document.createElement('span');
    chip.className = 'ignore-rule-flag-chip flag-close';
    chip.textContent = '閉じない';
    flags.appendChild(chip);
  }
  if (rule.ignoreOnRestore) {
    const chip = document.createElement('span');
    chip.className = 'ignore-rule-flag-chip flag-restore';
    chip.textContent = '復元しない';
    flags.appendChild(chip);
  }
  item.appendChild(flags);

  const actions = document.createElement('div');
  actions.className = 'ignore-rule-item-actions';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'ignore-rule-action-button danger';
  removeButton.textContent = '削除';
  removeButton.setAttribute('aria-label', '無視URLルールを削除');
  removeButton.addEventListener('click', () => {
    void onRemoveIgnoreRule(rule.id);
  });
  actions.appendChild(removeButton);

  item.appendChild(actions);

  return item;
}

function showIgnoreRuleError(message: string): void {
  const error = document.getElementById('ignore-rule-error');
  if (!error) return;
  error.textContent = message;
  error.style.display = 'block';
}

function clearIgnoreRuleError(): void {
  const error = document.getElementById('ignore-rule-error');
  if (!error) return;
  error.textContent = '';
  error.style.display = 'none';
}

async function onAddIgnoreRule(event: Event): Promise<void> {
  event.preventDefault();
  clearIgnoreRuleError();

  const patternInput = document.getElementById('ignore-rule-pattern') as HTMLInputElement | null;
  const labelInput = document.getElementById('ignore-rule-label') as HTMLInputElement | null;
  const onSaveInput = document.getElementById('ignore-rule-on-save') as HTMLInputElement | null;
  const onCloseInput = document.getElementById('ignore-rule-on-close') as HTMLInputElement | null;
  const onRestoreInput = document.getElementById('ignore-rule-on-restore') as HTMLInputElement | null;

  const pattern = patternInput?.value.trim() ?? '';
  const label = labelInput?.value.trim() ?? '';
  const ignoreOnSave = !!onSaveInput?.checked;
  const ignoreOnClose = !!onCloseInput?.checked;
  const ignoreOnRestore = !!onRestoreInput?.checked;

  if (pattern.length === 0) {
    showIgnoreRuleError('URLパターンを入力してください');
    return;
  }
  if (!ignoreOnSave && !ignoreOnClose && !ignoreOnRestore) {
    showIgnoreRuleError('少なくとも1つの「無視する動作」を選択してください');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'ADD_IGNORE_RULE',
      payload: {
        pattern,
        label: label.length > 0 ? label : undefined,
        ignoreOnSave,
        ignoreOnClose,
        ignoreOnRestore,
      },
    });

    if (!response?.success) {
      showIgnoreRuleError(response?.error || '追加に失敗しました');
      return;
    }

    if (patternInput) patternInput.value = '';
    if (labelInput) labelInput.value = '';
    if (onSaveInput) onSaveInput.checked = false;
    if (onCloseInput) onCloseInput.checked = false;
    if (onRestoreInput) onRestoreInput.checked = false;

    await loadIgnoreRules();
    toastManager.show({
      message: '無視URLルールを追加しました',
      type: 'success',
    });
  } catch (error) {
    console.error('Failed to add ignore rule', error);
    showIgnoreRuleError('追加処理でエラーが発生しました');
  }
}

async function onToggleIgnoreRule(id: string, enabled: boolean): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_IGNORE_RULE',
      payload: { id, patch: { enabled } },
    });
    if (!response?.success) {
      toastManager.show({
        message: response?.error || '更新に失敗しました',
        type: 'error',
      });
    }
  } catch (error) {
    console.error('Failed to toggle ignore rule', error);
    toastManager.show({
      message: '更新処理でエラーが発生しました',
      type: 'error',
    });
  } finally {
    await loadIgnoreRules();
  }
}

async function onRemoveIgnoreRule(id: string): Promise<void> {
  if (!window.confirm('この無視URLルールを削除しますか？')) {
    return;
  }
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'REMOVE_IGNORE_RULE',
      payload: { id },
    });
    if (!response?.success) {
      toastManager.show({
        message: response?.error || '削除に失敗しました',
        type: 'error',
      });
      return;
    }
    toastManager.show({
      message: '無視URLルールを削除しました',
      type: 'success',
    });
  } catch (error) {
    console.error('Failed to remove ignore rule', error);
    toastManager.show({
      message: '削除処理でエラーが発生しました',
      type: 'error',
    });
  } finally {
    await loadIgnoreRules();
  }
}

document.getElementById('ignore-rule-add-form')?.addEventListener('submit', onAddIgnoreRule);

// 初期化
checkAuthStatus();
