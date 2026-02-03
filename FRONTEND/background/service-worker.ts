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

const optimizedRestoreService = optimizedServiceFactory.createOptimizedRestoreService(
  windowsAdapter,
  tabsAdapter,
  calendarEventService, // 非最適化版を使用（recordRestoreのため）
  optimizedTabRestoreManager
);

// Bolt 7: 前後関係取得のための依存関係
const restoreRelationService = new RestoreRelationService(calendarEventRepository, logger);

// ログ: パフォーマンス最適化サービスの初期化完了
logger.info('Performance optimized services initialized');

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
            // Bolt 10: パフォーマンス最適化（キャッシュ + 監視）
            const tabs = await optimizedTabCaptureService.getCurrentWindowTabs();
            sendResponse({ 
              success: true, 
              tabs: tabs.map(tab => ({
                url: tab.url,
                title: tab.title,
                faviconUrl: tab.faviconUrl,
                index: tab.index,
              }))
            });
          } catch (error) {
            sendResponse({ 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
          break;

        case 'SAVE_WORK_STATE':
          try {
            const { title, memo } = message.payload as { title: string; memo?: string };
            
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

            // タブ情報を取得（Bolt 10: パフォーマンス最適化）
            const tabs = await optimizedTabCaptureService.getCurrentWindowTabs();
            if (tabs.length === 0) {
              sendResponse({ success: false, error: 'No tabs to save' });
              break;
            }

            // 復元元のイベントIDと復元時刻を取得（Bolt 7: 復元後に保存する際に使用）
            const storageData = await chrome.storage.local.get(['lastRestoredEventId', 'lastRestoredAtTime']);
            const restoredFromEventId = storageData.lastRestoredEventId 
              ? EventId.create(storageData.lastRestoredEventId)
              : undefined;
            const restoredAtTime = storageData.lastRestoredAtTime 
              ? new Date(storageData.lastRestoredAtTime)
              : undefined;

            // カレンダーイベントとして保存（Bolt 10: パフォーマンス最適化）
            const eventId = await optimizedCalendarEventService.createWorkStateEvent(
              tabs,
              title,
              authState.calendarId,
              authState.accessToken,
              memo,
              restoredFromEventId,
              restoredAtTime
            );

            // 保存が成功したら、復元関連データをクリア（次の保存時には使用しない）
            if (restoredFromEventId) {
              await chrome.storage.local.remove(['lastRestoredEventId', 'lastRestoredAtTime']);
            }

            // 保存成功後、保存したタブを閉じる（作業状態をリセット）
            try {
              await optimizedTabCaptureService.closeCurrentWindowTabs();
            } catch (closeError) {
              // タブを閉じる際のエラーはログに記録するだけで、保存処理は成功として扱う
              logger.warn('Failed to close tabs after save', closeError instanceof Error ? closeError : new Error(String(closeError)));
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

            // 復元元のイベントIDと復元時刻をChrome Storageに保存（Bolt 7: 復元後に保存する際に使用）
            await chrome.storage.local.set({ 
              lastRestoredEventId: eventId,
              lastRestoredAtTime: restoredAtTime
            });

            sendResponse({ 
              success: true, 
              windowId: result.windowId,
              tabCount: result.tabIds.length
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
