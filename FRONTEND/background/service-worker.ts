import { ChromeIdentityAdapter } from '../src/infrastructure/adapters/chrome-identity-adapter';
import { AuthRepositoryImpl } from '../src/infrastructure/repositories/auth-repository-impl';
import { GoogleCalendarAdapter } from '../src/infrastructure/adapters/google-calendar-adapter';
import { Logger } from '../src/infrastructure/adapters/logger';
import { AuthenticationService } from '../src/application/services/authentication-service';
import { CalendarInitializationService } from '../src/application/services/calendar-initialization-service';
import { TokenRefreshService } from '../src/application/services/token-refresh-service';
// import { EventHandler } from '../src/application/handlers/event-handler'; // 将来的に使用予定

// 依存関係の初期化
const identityAdapter = new ChromeIdentityAdapter();
const authRepository = new AuthRepositoryImpl();
const calendarAdapter = new GoogleCalendarAdapter();
// const uiMessenger = new UIMessenger(); // 将来的に使用予定
const logger = new Logger();

const authenticationService = new AuthenticationService(identityAdapter, authRepository);
const calendarInitService = new CalendarInitializationService(authRepository, calendarAdapter);
const tokenRefreshService = new TokenRefreshService(authRepository, identityAdapter);
// const eventHandler = new EventHandler(uiMessenger, logger); // 将来的に使用予定

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
