import { ChromeIdentityAdapter } from '../src/infrastructure/adapters/chrome-identity-adapter';
import { AuthRepositoryImpl } from '../src/infrastructure/repositories/auth-repository-impl';
import { GoogleCalendarAdapter } from '../src/infrastructure/adapters/google-calendar-adapter';
import { Logger } from '../src/infrastructure/adapters/logger';
import { AuthenticationService } from '../src/application/services/authentication-service';
import { CalendarInitializationService } from '../src/application/services/calendar-initialization-service';
import { TokenRefreshService } from '../src/application/services/token-refresh-service';
import { EventHandler } from '../src/application/handlers/event-handler';
import { UIMessenger } from '../src/infrastructure/adapters/ui-messenger';
import { ChromeTabsAdapter } from '../src/infrastructure/adapters/chrome-tabs-adapter';
import { ChromeWindowsAdapter } from '../src/infrastructure/adapters/chrome-windows-adapter';
import { CalendarEventRepositoryImpl } from '../src/infrastructure/repositories/calendar-event-repository-impl';
import { CalendarEventService } from '../src/application/services/calendar-event-service';
import { RestoreRelationService } from '../src/application/services/restore-relation-service';
import { EventId } from '../src/domain/value-objects/event-id';
import { TabInfo } from '../src/domain/value-objects/tab-info';
// Bolt 9: エラーハンドリング
import { ErrorHandlingService } from '../src/application/services/error-handling-service';
// Bolt 10: パフォーマンス最適化
import { OptimizedServiceFactory } from '../src/application/factories/optimized-service-factory';
// Unit-7: 無視URL設定
import { ChromeStorageIgnoreRulesRepository } from '../src/infrastructure/repositories/chrome-storage-ignore-rules-repository';
import { IgnoreRulesService } from '../src/application/services/ignore-rules-service';
import {
  extractTabsFromEntries,
  filterEntriesBySelectedTabIds,
} from '../src/application/types/captured-tab-entry';

// 依存関係の初期化
const identityAdapter = new ChromeIdentityAdapter();
const authRepository = new AuthRepositoryImpl();
const calendarAdapter = new GoogleCalendarAdapter();
const uiMessenger = new UIMessenger();
const logger = new Logger();
// Bolt 9: エラーハンドリングサービス（将来のUI統合で使用予定）
const _errorHandlingService = new ErrorHandlingService();
void _errorHandlingService;

const authenticationService = new AuthenticationService(identityAdapter, authRepository);
const calendarInitService = new CalendarInitializationService(authRepository, calendarAdapter);
const tokenRefreshService = new TokenRefreshService(authRepository, identityAdapter);
const eventHandler = new EventHandler(uiMessenger, logger);

// Bolt 4: タブキャプチャとカレンダーイベント保存のための依存関係
const tabsAdapter = new ChromeTabsAdapter(logger);
const windowsAdapter = new ChromeWindowsAdapter(logger);
const calendarEventRepository = new CalendarEventRepositoryImpl(calendarAdapter, eventHandler);

// 非最適化版（復元メタデータ記録など一部の操作で使用）
const calendarEventService = new CalendarEventService(calendarEventRepository, eventHandler);

// Bolt 10: パフォーマンス最適化されたサービス
const optimizedServiceFactory = new OptimizedServiceFactory();

// 最適化されたサービス（パフォーマンス監視 + キャッシュ機能付き）
const optimizedTabCaptureService = optimizedServiceFactory.createOptimizedTabCaptureService(
  tabsAdapter,
  windowsAdapter,
  eventHandler
);

const optimizedCalendarEventService = optimizedServiceFactory.createOptimizedCalendarEventService(
  calendarEventRepository,
  eventHandler
);

const optimizedTabRestoreManager = optimizedServiceFactory.createOptimizedTabRestoreManager(tabsAdapter);

// Unit-7: 無視URL設定（RestoreService から参照するため先に初期化）
const ignoreRulesRepository = new ChromeStorageIgnoreRulesRepository(logger);
const ignoreRulesService = new IgnoreRulesService(ignoreRulesRepository, logger);

const optimizedRestoreService = optimizedServiceFactory.createOptimizedRestoreService(
  windowsAdapter,
  tabsAdapter,
  calendarEventService, // 非最適化版を使用（recordRestoreのため）
  optimizedTabRestoreManager,
  ignoreRulesService // Unit-7: 復元時の無視URLフィルタ
);

// Bolt 7: 前後関係取得のための依存関係
const restoreRelationService = new RestoreRelationService(calendarEventRepository, logger);

// 設定が外部（サイドパネル等）から変更された場合にキャッシュを無効化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.ignoreRules) {
    ignoreRulesService.invalidateCache();
  }
});

// ログ: パフォーマンス最適化サービスの初期化完了
logger.info('Performance optimized services initialized');

/**
 * Google Calendar イベント詳細URL用の eid を構築する（非公式仕様: eventId + " " + calendarId の base64url）
 */
function buildCalendarEventEid(eventId: string, calendarId: string): string {
  const raw = `${eventId} ${calendarId}`;
  const base64 = btoa(raw);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 拡張機能のインストール時（アラーム設定は下記に移動）

// メッセージハンドラー
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'AUTHENTICATE':
          const authState = await authenticationService.authenticate();
          // カレンダー初期化も実行
          await calendarInitService.ensureCalendarExists();
          sendResponse({ success: true, authState });
          break;

        case 'CHECK_AUTH':
          const isAuthenticated = await authenticationService.isAuthenticated();
          sendResponse({ success: true, isAuthenticated });
          break;

        case 'LOGOUT':
          await authenticationService.logout();
          sendResponse({ success: true });
          break;

        case 'GET_CURRENT_TABS':
          try {
            const tabEntries = await optimizedTabCaptureService.getAllWindowsTabEntries();
            sendResponse({
              success: true,
              tabs: tabEntries.map((entry) => ({
                tabId: entry.tabId,
                windowId: entry.windowId,
                url: entry.url,
                title: entry.title,
                faviconUrl: entry.faviconUrl,
                index: entry.index,
              })),
            });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;

        case 'SAVE_WORK_STATE':
          try {
            const { title, memo, selectedTabIds } = message.payload as {
              title: string;
              memo?: string;
              selectedTabIds?: number[];
            };
            
            // バリデーション
            if (!title || title.trim().length === 0) {
              sendResponse({ success: false, error: 'Title is required' });
              break;
            }

            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // タブ情報を取得（全ウィンドウ、Bolt 10: パフォーマンス最適化）
            const allTabEntries = await optimizedTabCaptureService.getAllWindowsTabEntries();
            const selectedEntries = filterEntriesBySelectedTabIds(allTabEntries, selectedTabIds);

            if (selectedTabIds !== undefined && selectedTabIds.length === 0) {
              sendResponse({ success: false, error: '保存するタブが選択されていません' });
              break;
            }

            if (selectedEntries.length === 0) {
              sendResponse({ success: false, error: 'No tabs to save' });
              break;
            }

            const { tabs, tabIdUrlPairs } = extractTabsFromEntries(selectedEntries);
            if (tabs.length === 0) {
              sendResponse({ success: false, error: 'No tabs to save' });
              break;
            }

            // Unit-7: 無視URL設定で「保存対象から除外」されるタブをフィルタ
            const filteredTabsForSave = await ignoreRulesService.filterTabsForSave(tabs);
            if (filteredTabsForSave.length === 0) {
              sendResponse({
                success: false,
                error:
                  'すべてのタブが無視URL設定で保存対象外です。設定を見直してください。',
              });
              break;
            }
            // index を 0 から振り直す（保存後の順序維持のため）
            const reindexedTabs = filteredTabsForSave.map((t, i) =>
              TabInfo.create({
                url: t.url,
                title: t.title,
                faviconUrl: t.faviconUrl,
                index: i,
                extensions: t.extensions,
              })
            );

            // Unit-7: 「閉じる無視」フラグに該当しないタブIDだけを閉じる対象とする
            const closeTargetTabIds =
              await ignoreRulesService.filterTabIdsForClose(tabIdUrlPairs);

            // 復元元のイベントIDと復元時刻を取得（Bolt 7: 復元後に保存する際に使用）
            const storageData = await chrome.storage.local.get(['lastRestoredEventId', 'lastRestoredAtTime']);
            const restoredFromEventId = storageData.lastRestoredEventId
              ? EventId.create(storageData.lastRestoredEventId)
              : undefined;
            const restoredAtTime = storageData.lastRestoredAtTime
              ? new Date(storageData.lastRestoredAtTime)
              : undefined;

            // カレンダーイベントとして保存（Bolt 10: パフォーマンス最適化）
            // Unit-7: 保存対象は ignoreOnSave でフィルタ済みの reindexedTabs を使用
            const eventId = await optimizedCalendarEventService.createWorkStateEvent(
              reindexedTabs,
              title,
              authState.calendarId,
              authState.accessToken,
              memo,
              restoredFromEventId,
              restoredAtTime
            );

            // 保存が成功したら、復元関連データをクリア（次の保存時には使用しない）
            if (restoredFromEventId) {
              await chrome.storage.local.remove([
                'lastRestoredEventId',
                'lastRestoredAtTime',
                'lastRestoredWorkTitle',
              ]);
            }

            // 保存成功後、サイドパネルが開いているウィンドウを維持しつつ全タブを閉じる
            // chrome.sidePanel.open() はユーザージェスチャーが必要で呼び出せないため、
            // 既存ウィンドウのタブを1つ残して遷移させることでサイドパネルを開いたまま保持する
            try {
              let keepTabId: number | undefined;
              // Unit-7: keepTabId が「閉じない」対象だった場合、URL書き換えもスキップする
              let keepTabIsIgnoredOnClose = false;
              try {
                // サイドパネルが開いているウィンドウ（最後にフォーカスされたウィンドウ）のアクティブタブを取得
                const activeTabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
                if (activeTabs.length > 0 && activeTabs[0].id !== undefined) {
                  keepTabId = activeTabs[0].id;
                  // 「閉じない」対象は closeTargetTabIds に含まれない
                  // → keepTabId が closeTargetTabIds に含まれない場合は、書き換えずにそのまま残す
                  //   （例: Google Meet 通話を切断させない）
                  keepTabIsIgnoredOnClose = !closeTargetTabIds.includes(keepTabId);
                  if (!keepTabIsIgnoredOnClose) {
                    // 通常タブはそのまま閉じるとウィンドウごと消えるため新タブに遷移させて維持
                    await chrome.tabs.update(keepTabId, { url: 'chrome://newtab' });
                  }
                }
              } catch (preserveError) {
                logger.warn(
                  'Failed to preserve side panel window tab, will create new window',
                  preserveError instanceof Error ? preserveError : new Error(String(preserveError))
                );
                keepTabId = undefined;
                keepTabIsIgnoredOnClose = false;
              }

              // 保存対象のタブを閉じる（keepTabId は除外して残す）
              // Unit-7: ignoreOnClose に該当するタブは closeTargetTabIds に既に含まれていない
              const tabsToClose = keepTabId !== undefined
                ? closeTargetTabIds.filter(id => id !== keepTabId)
                : closeTargetTabIds;
              await optimizedTabCaptureService.closeAllCapturedTabs(tabsToClose);

              // フォールバック: タブの維持に失敗した場合は新規ウィンドウを作成
              if (keepTabId === undefined) {
                await windowsAdapter.createWindow(['about:newtab']);
              }
            } catch (closeError) {
              logger.warn('Failed to close tabs or maintain window after save', closeError instanceof Error ? closeError : new Error(String(closeError)));
            }

            sendResponse({ success: true, eventId: eventId.value });
          } catch (error) {
            logger.error('Failed to save work state', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'GET_WORK_STATE_EVENTS':
          try {
            const { startDate, endDate } = message.payload as { startDate: string; endDate: string };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // 仕事状態を取得（Bolt 10: パフォーマンス最適化 + キャッシュ）
            const workStates = await optimizedCalendarEventService.getWorkStateEvents(
              new Date(startDate),
              new Date(endDate),
              authState.calendarId,
              authState.accessToken
            );

            // UI用にフォーマット（新しい順にソート）
            const sortedWorkStates = workStates.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());

            sendResponse({ 
              success: true, 
              workStates: sortedWorkStates.map(ws => ({
                eventId: ws.eventId.value,
                title: ws.title.value,
                startTime: ws.startTime.toISOString(),
                endTime: ws.endTime.toISOString(),
                tabCount: ws.metadata?.tabs.length || 0,
                favicons: ws.metadata?.tabs.slice(0, 5).map(tab => tab.faviconUrl).filter((url): url is string => url !== undefined) || [],
                memo: ws.metadata?.memo,
                isCorrupted: ws.isCorrupted,
                hasRestoredFrom: !!ws.metadata?.restoredFrom, // 復元元があるか（Bolt 7）
                hasRestoredTo: !!(ws.metadata?.restoredTo && ws.metadata.restoredTo.length > 0), // 復元先があるか（Bolt 7）
              }))
            });
          } catch (error) {
            logger.error('Failed to get work state events', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'GET_WORK_STATE_DETAIL': // Bolt 8: URL編集機能
          try {
            const { eventId } = message.payload as { eventId: string };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // WorkStateを取得
            const workState = await calendarEventRepository.findById(
              EventId.create(eventId),
              authState.calendarId,
              authState.accessToken
            );

            if (!workState) {
              sendResponse({ success: false, error: 'WorkState not found' });
              break;
            }

            // UI用にフォーマット
            const tabsData = workState.metadata?.tabs.map(tab => ({
              url: tab.url,
              title: tab.title,
              faviconUrl: tab.faviconUrl,
              index: tab.index,
            })) || [];
            
            sendResponse({ 
              success: true, 
              workState: {
                eventId: workState.eventId.value,
                title: workState.title.value,
                tabs: tabsData,
              }
            });
          } catch (error) {
            logger.error('Failed to get work state detail', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'RESTORE_WORK_STATE':
          try {
            const { eventId } = message.payload as { eventId: string };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // 復元ボタンを押した時刻を記録
            const restoredAtTime = new Date().toISOString();

            // 復元を実行（Bolt 10: パフォーマンス最適化 + バッチ処理）
            const result = await optimizedRestoreService.restoreWorkState(
              EventId.create(eventId),
              authState.calendarId,
              authState.accessToken
            );

            // 復元元のイベントID・復元時刻・仕事名をChrome Storageに保存（復元後の保存フォームのデフォルト表示用）
            await chrome.storage.local.set({
              lastRestoredEventId: eventId,
              lastRestoredAtTime: restoredAtTime,
              lastRestoredWorkTitle: result.title ?? '',
            });

            sendResponse({
              success: true,
              windowId: result.windowId,
              tabCount: result.tabIds.length,
            });
          } catch (error) {
            logger.error('Failed to restore work state', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'GET_RESTORE_RELATIONS':
          try {
            const { eventId } = message.payload as { eventId: string };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // 前後関係を取得
            const relations = await restoreRelationService.getRestoreRelations(
              EventId.create(eventId),
              authState.calendarId,
              authState.accessToken
            );

            sendResponse({ 
              success: true, 
              relations: {
                restoredFrom: relations.restoredFrom ? {
                  eventId: relations.restoredFrom.eventId,
                  title: relations.restoredFrom.title,
                  savedAt: relations.restoredFrom.savedAt,
                } : null,
                restoredTo: relations.restoredTo.map(r => ({
                  eventId: r.eventId,
                  title: r.title,
                  savedAt: r.savedAt,
                  restoredAt: r.restoredAt,
                })),
              }
            });
          } catch (error) {
            logger.error('Failed to get restore relations', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'UPDATE_WORK_STATE_TABS': // Bolt 8: URL編集機能
          try {
            const { eventId, newTabs } = message.payload as { 
              eventId: string; 
              newTabs: Array<{ url: string; title: string; faviconUrl?: string; index: number }> 
            };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // TabInfoに変換
            const tabInfos = newTabs.map(tab => TabInfo.create({
              url: tab.url,
              title: tab.title,
              faviconUrl: tab.faviconUrl,
              index: tab.index,
            }));

            // タブリストを更新（Bolt 10: パフォーマンス最適化）
            await optimizedCalendarEventService.updateWorkStateTabs(
              EventId.create(eventId),
              tabInfos,
              authState.calendarId,
              authState.accessToken
            );

            sendResponse({ success: true });
          } catch (error) {
            logger.error('Failed to update work state tabs', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'ADD_TAB_TO_WORK_STATE': // Bolt 8: URL編集機能
          try {
            const { eventId, tab, index } = message.payload as { 
              eventId: string; 
              tab: { url: string; title: string; faviconUrl?: string; index: number };
              index?: number;
            };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // TabInfoに変換
            const tabInfo = TabInfo.create({
              url: tab.url,
              title: tab.title,
              faviconUrl: tab.faviconUrl,
              index: tab.index,
            });

            // タブを追加（Bolt 10: パフォーマンス最適化）
            await optimizedCalendarEventService.addTabToWorkState(
              EventId.create(eventId),
              tabInfo,
              index,
              authState.calendarId,
              authState.accessToken
            );

            sendResponse({ success: true });
          } catch (error) {
            logger.error('Failed to add tab to work state', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'REMOVE_TAB_FROM_WORK_STATE': // Bolt 8: URL編集機能
          try {
            const { eventId, tabIndex } = message.payload as { 
              eventId: string; 
              tabIndex: number;
            };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // タブを削除（Bolt 10: パフォーマンス最適化）
            await optimizedCalendarEventService.removeTabFromWorkState(
              EventId.create(eventId),
              tabIndex,
              authState.calendarId,
              authState.accessToken
            );

            sendResponse({ success: true });
          } catch (error) {
            logger.error('Failed to remove tab from work state', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'REORDER_WORK_STATE_TABS': // Bolt 8: URL編集機能
          try {
            const { eventId, fromIndex, toIndex } = message.payload as { 
              eventId: string; 
              fromIndex: number;
              toIndex: number;
            };
            
            // 認証状態を確認
            const authState = await authRepository.getCurrent();
            if (!authState || !authState.calendarId || !authState.accessToken) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }

            // タブの順序を変更（Bolt 10: パフォーマンス最適化）
            await optimizedCalendarEventService.reorderWorkStateTabs(
              EventId.create(eventId),
              fromIndex,
              toIndex,
              authState.calendarId,
              authState.accessToken
            );

            sendResponse({ success: true });
          } catch (error) {
            logger.error('Failed to reorder work state tabs', error instanceof Error ? error : new Error(String(error)));
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'GET_IGNORE_RULES': // Unit-7: 無視URL設定
          try {
            const rules = await ignoreRulesService.listRules();
            sendResponse({
              success: true,
              rules: rules.map((r) => ({
                id: r.id,
                pattern: r.pattern.value,
                ignoreOnSave: r.flags.ignoreOnSave,
                ignoreOnClose: r.flags.ignoreOnClose,
                ignoreOnRestore: r.flags.ignoreOnRestore,
                label: r.label,
                enabled: r.enabled,
                createdAt: r.createdAt.toISOString(),
                updatedAt: r.updatedAt.toISOString(),
              })),
            });
          } catch (error) {
            logger.error(
              'Failed to get ignore rules',
              error instanceof Error ? error : new Error(String(error))
            );
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;

        case 'ADD_IGNORE_RULE': // Unit-7: 無視URL設定
          try {
            const { pattern, ignoreOnSave, ignoreOnClose, ignoreOnRestore, label, enabled } =
              message.payload as {
                pattern: string;
                ignoreOnSave: boolean;
                ignoreOnClose: boolean;
                ignoreOnRestore: boolean;
                label?: string;
                enabled?: boolean;
              };
            const rule = await ignoreRulesService.addRule({
              pattern,
              ignoreOnSave,
              ignoreOnClose,
              ignoreOnRestore,
              label,
              enabled,
            });
            sendResponse({
              success: true,
              rule: {
                id: rule.id,
                pattern: rule.pattern.value,
                ignoreOnSave: rule.flags.ignoreOnSave,
                ignoreOnClose: rule.flags.ignoreOnClose,
                ignoreOnRestore: rule.flags.ignoreOnRestore,
                label: rule.label,
                enabled: rule.enabled,
                createdAt: rule.createdAt.toISOString(),
                updatedAt: rule.updatedAt.toISOString(),
              },
            });
          } catch (error) {
            logger.error(
              'Failed to add ignore rule',
              error instanceof Error ? error : new Error(String(error))
            );
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;

        case 'UPDATE_IGNORE_RULE': // Unit-7: 無視URL設定
          try {
            const { id, patch } = message.payload as {
              id: string;
              patch: {
                pattern?: string;
                ignoreOnSave?: boolean;
                ignoreOnClose?: boolean;
                ignoreOnRestore?: boolean;
                label?: string;
                enabled?: boolean;
              };
            };
            const rule = await ignoreRulesService.updateRule(id, patch);
            sendResponse({
              success: true,
              rule: {
                id: rule.id,
                pattern: rule.pattern.value,
                ignoreOnSave: rule.flags.ignoreOnSave,
                ignoreOnClose: rule.flags.ignoreOnClose,
                ignoreOnRestore: rule.flags.ignoreOnRestore,
                label: rule.label,
                enabled: rule.enabled,
                createdAt: rule.createdAt.toISOString(),
                updatedAt: rule.updatedAt.toISOString(),
              },
            });
          } catch (error) {
            logger.error(
              'Failed to update ignore rule',
              error instanceof Error ? error : new Error(String(error))
            );
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;

        case 'REMOVE_IGNORE_RULE': // Unit-7: 無視URL設定
          try {
            const { id } = message.payload as { id: string };
            await ignoreRulesService.removeRule(id);
            sendResponse({ success: true });
          } catch (error) {
            logger.error(
              'Failed to remove ignore rule',
              error instanceof Error ? error : new Error(String(error))
            );
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;

        case 'GET_EVENT_CALENDAR_URL':
          try {
            const { eventId } = message.payload as { eventId: string };
            if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
              sendResponse({ success: false, error: 'eventId is required' });
              break;
            }
            const authStateForUrl = await authRepository.getCurrent();
            if (!authStateForUrl?.calendarId?.value) {
              sendResponse({ success: false, error: 'Not authenticated' });
              break;
            }
            const eid = buildCalendarEventEid(eventId.trim(), authStateForUrl.calendarId.value);
            const url = `https://calendar.google.com/calendar/u/0/r/eventedit/${eid}`;
            sendResponse({ success: true, url });
          } catch (err) {
            logger.error('Failed to build calendar event URL', err instanceof Error ? err : new Error(String(err)));
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      logger.error('Error handling message', error instanceof Error ? error : new Error(String(error)));
      sendResponse({ success: false, error: String(error) });
    }
  })();

  return true; // 非同期レスポンスを許可
});

// 拡張機能のインストール時にアラームを設定
chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
  // トークン更新のアラームを設定
  chrome.alarms.create('refreshToken', { periodInMinutes: 30 });
});

// 拡張機能アイコンをクリックしたときにサイドパネルを開く
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 定期的にトークンを更新
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshToken') {
    tokenRefreshService.refreshTokenIfNeeded().catch((error) => {
      logger.error('Failed to refresh token', error);
    });
  }
});
