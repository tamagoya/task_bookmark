import { EventHandler } from '../../../src/application/handlers/event-handler';
import { UIMessenger } from '../../../src/infrastructure/adapters/ui-messenger';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { UserAuthenticated } from '../../../src/domain/events/user-authenticated';
import { TokenRefreshed } from '../../../src/domain/events/token-refreshed';
import { AuthenticationFailed } from '../../../src/domain/events/authentication-failed';
import { UserLoggedOut } from '../../../src/domain/events/user-logged-out';
import { CalendarInitialized } from '../../../src/domain/events/calendar-initialized';
import { TabsCaptured } from '../../../src/domain/events/tabs-captured';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

// モック
jest.mock('../../../src/infrastructure/adapters/ui-messenger');
jest.mock('../../../src/infrastructure/adapters/logger');

describe('EventHandler', () => {
  let handler: EventHandler;
  let uiMessenger: jest.Mocked<UIMessenger>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    uiMessenger = new UIMessenger() as jest.Mocked<UIMessenger>;
    logger = new Logger() as jest.Mocked<Logger>;
    handler = new EventHandler(uiMessenger, logger);
  });

  describe('handleUserAuthenticated', () => {
    it('UserAuthenticatedイベントを処理する', async () => {
      const event = new UserAuthenticated('user-123', new Date());
      uiMessenger.sendMessage.mockResolvedValue();

      await handler.handleUserAuthenticated(event);

      expect(logger.info).toHaveBeenCalledWith('User authenticated: user-123');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'USER_AUTHENTICATED',
        payload: {
          userId: 'user-123',
          authenticatedAt: event.authenticatedAt,
        },
      });
    });
  });

  describe('handleTokenRefreshed', () => {
    it('TokenRefreshedイベントを処理する', async () => {
      const event = new TokenRefreshed('user-123', new Date(), new Date());

      await handler.handleTokenRefreshed(event);

      expect(logger.info).toHaveBeenCalledWith('Token refreshed: user-123');
      expect(uiMessenger.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleAuthenticationFailed', () => {
    it('AuthenticationFailedイベントを処理する', async () => {
      const event = new AuthenticationFailed('user-123', 'AUTH_ERROR', 'Authentication failed', new Date());
      uiMessenger.sendMessage.mockResolvedValue();

      await handler.handleAuthenticationFailed(event);

      expect(logger.error).toHaveBeenCalledWith(
        'Authentication failed: Authentication failed',
        expect.any(Error)
      );
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'AUTHENTICATION_FAILED',
        payload: {
          errorCode: 'AUTH_ERROR',
          errorMessage: 'Authentication failed',
        },
      });
    });
  });

  describe('handleUserLoggedOut', () => {
    it('UserLoggedOutイベントを処理する', async () => {
      const event = new UserLoggedOut('user-123', new Date());
      uiMessenger.sendMessage.mockResolvedValue();

      await handler.handleUserLoggedOut(event);

      expect(logger.info).toHaveBeenCalledWith('User logged out: user-123');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'USER_LOGGED_OUT',
        payload: {
          userId: 'user-123',
          loggedOutAt: event.loggedOutAt,
        },
      });
    });
  });

  describe('handleCalendarInitialized', () => {
    it('CalendarInitializedイベントを処理する', async () => {
      const event = new CalendarInitialized('user-123', 'calendar-id-12345', new Date());
      uiMessenger.sendMessage.mockResolvedValue();

      await handler.handleCalendarInitialized(event);

      expect(logger.info).toHaveBeenCalledWith('Calendar initialized: calendar-id-12345');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'CALENDAR_INITIALIZED',
        payload: {
          userId: 'user-123',
          calendarId: 'calendar-id-12345',
          initializedAt: event.initializedAt,
        },
      });
    });
  });

  describe('handleTabsCaptured', () => {
    it('TabsCapturedイベントを処理する', async () => {
      const tabs = [
        TabInfo.create({
          url: 'https://example.com',
          title: 'Example Page',
          index: 0,
        }),
        TabInfo.create({
          url: 'https://other.com',
          title: 'Other Page',
          index: 1,
        }),
      ];
      const event = new TabsCaptured(tabs, 12345, new Date());
      uiMessenger.sendMessage.mockResolvedValue();

      await handler.handleTabsCaptured(event);

      expect(logger.info).toHaveBeenCalledWith('Tabs captured: 2 tabs in window 12345');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'TABS_CAPTURED',
        payload: {
          tabs: tabs.map((tab) => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
            extensions: tab.extensions,
          })),
          windowId: 12345,
          capturedAt: event.capturedAt,
          tabCount: 2,
        },
      });
    });
  });
});
