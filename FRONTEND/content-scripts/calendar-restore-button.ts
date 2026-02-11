/**
 * Google Calendar 予定詳細に「復元」ボタンを注入する Content Script
 *
 * Google Calendar は説明欄のURLを <a> タグに変換するため、JSONテキストが複数の
 * テキストノードに分断される。そのためテキストノード単位ではなく、要素の textContent
 * を使って JSON を検出する。
 *
 * 要素の探索では、textContent に JSON マーカーを含む要素のうち、最も textContent が
 * 短い要素（＝最も深いネストの要素）を選択して、適切な位置にボタンを注入する。
 */

const INJECTED_ATTR = 'data-taskbookmark-restore-injected';

/**
 * テキストから最初の完全な JSON オブジェクトを抽出する。
 * 文字列リテラル内のブレースを正しくスキップする。
 */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) return null;

  let inString = false;
  let escape = false;
  let depth = 0;
  let end = -1;

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(text.slice(firstBrace, end)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * パースしたオブジェクトがタスクブックマークの JSON かどうかを判定する
 */
function isTaskBookmarkJson(obj: Record<string, unknown>): boolean {
  return typeof obj.version === 'string' && Array.isArray(obj.tabs);
}

/**
 * タスクブックマーク JSON から eventId を取得する
 * トップレベル → extensions.eventId の順で探す
 */
function getEventId(obj: Record<string, unknown>): string | null {
  if (typeof obj.eventId === 'string' && obj.eventId.trim()) {
    return obj.eventId.trim();
  }
  if (obj.extensions && typeof obj.extensions === 'object') {
    const ext = obj.extensions as Record<string, unknown>;
    if (typeof ext.eventId === 'string' && ext.eventId.trim()) {
      return ext.eventId.trim();
    }
  }
  return null;
}

/**
 * 復元を実行し、結果に応じてメッセージを表示
 */
function runRestore(eventId: string, button: HTMLButtonElement): void {
  button.disabled = true;
  button.textContent = '復元中...';
  chrome.runtime.sendMessage(
    { type: 'RESTORE_WORK_STATE', payload: { eventId } },
    (response: { success?: boolean; error?: string } | undefined) => {
      if (chrome.runtime.lastError) {
        button.textContent = '復元';
        button.disabled = false;
        showToast('拡張機能との通信に失敗しました。');
        return;
      }
      if (response?.success) {
        button.textContent = '復元完了';
        button.disabled = false;
        showToast('復元を開始しました。');
      } else {
        button.textContent = '復元';
        button.disabled = false;
        showToast(response?.error || '復元に失敗しました。');
      }
    }
  );
}

/**
 * トースト風のメッセージを表示
 */
function showToast(message: string): void {
  const existing = document.getElementById('taskbookmark-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'taskbookmark-toast';
  toast.textContent = message;
  toast.style.cssText =
    'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);' +
    'background:#333;color:#fff;padding:8px 16px;border-radius:4px;' +
    'z-index:99999;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * 復元ボタン要素を作成
 */
function createRestoreButton(eventId: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute(INJECTED_ATTR, 'true');
  button.textContent = '復元';
  button.type = 'button';
  button.style.cssText =
    'margin:8px 0;padding:6px 16px;background:#1a73e8;color:#fff;' +
    'border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:500;' +
    'letter-spacing:0.25px;';
  button.addEventListener('mouseenter', () => {
    button.style.background = '#1765cc';
  });
  button.addEventListener('mouseleave', () => {
    button.style.background = '#1a73e8';
  });
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    runRestore(eventId, button);
  });
  return button;
}

/**
 * DOM を走査し、タスクブックマークの説明欄を見つけてボタンを注入
 *
 * 戦略: textContent に "version" と "tabs" を含む要素のうち、textContent が
 * 最も短い要素（＝最も深いネスト＝説明欄のコンテナに最も近い）を選び、
 * その直前にボタンを注入する。
 */
function scanAndInject(): void {
  // 既にボタンが存在するならスキップ
  const existingButton = document.querySelector(`[${INJECTED_ATTR}]`);
  if (existingButton) {
    // ボタンの親要素がまだ表示されているか確認
    // 非表示（detached or hidden）なら除去して再注入する
    const htmlEl = existingButton as HTMLElement;
    if (htmlEl.offsetParent !== null || htmlEl.offsetWidth > 0) return;
    existingButton.remove();
  }

  let bestElement: Element | null = null;
  let bestLength = Infinity;
  let bestEventId: string | null = null;

  const allElements = document.querySelectorAll('span, div, p, section, article');
  for (const el of allElements) {
    const text = el.textContent || '';
    // 最低限のサイズチェック（JSON は最低でも数十文字ある）
    if (text.length < 30 || text.length > 50000) continue;
    if (!text.includes('"version"') || !text.includes('"tabs"')) continue;

    const parsed = extractJsonObject(text);
    if (!parsed || !isTaskBookmarkJson(parsed)) continue;

    const eventId = getEventId(parsed);
    if (!eventId) continue;

    // 最も textContent が短い要素を選ぶ（最も深い＝最も説明欄に近い）
    if (text.length < bestLength) {
      bestLength = text.length;
      bestElement = el;
      bestEventId = eventId;
    }
  }

  if (!bestElement || !bestEventId) return;

  // 既に注入されていないか確認
  const parent = bestElement.parentElement;
  if (parent && parent.querySelector(`[${INJECTED_ATTR}]`)) return;

  // ボタンを説明欄の直前に注入
  const wrapper = document.createElement('div');
  wrapper.setAttribute(INJECTED_ATTR, 'true');
  wrapper.style.cssText = 'margin:4px 0 8px 0;';
  wrapper.appendChild(createRestoreButton(bestEventId));

  if (parent) {
    parent.insertBefore(wrapper, bestElement);
  }
}

/**
 * 初期実行と DOM 変更の監視
 */
function init(): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedScan = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      scanAndInject();
    }, 300);
  };

  // 初回スキャン
  scanAndInject();

  const observer = new MutationObserver(() => {
    debouncedScan();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
