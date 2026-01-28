import { UserAuthenticated } from '../../domain/events/user-authenticated';
import { TokenRefreshed } from '../../domain/events/token-refreshed';
import { AuthenticationFailed } from '../../domain/events/authentication-failed';
import { UserLoggedOut } from '../../domain/events/user-logged-out';
import { CalendarInitialized } from '../../domain/events/calendar-initialized';
import { UIMessenger } from '../../infrastructure/adapters/ui-messenger';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * EventHandler
 * Domain Eventsの処理を担当
 */
export class EventHandler {
  constructor(
    private readonly uiMessenger: UIMessenger,
    private readonly logger: Logger
  ) {}

  /**
   * UserAuthenticatedイベントを処理
   * @param event イベント
   */
  async handleUserAuthenticated(event: UserAuthenticated): Promise<void> {
    this.logger.info(`User authenticated: ${event.userId}`);
    await this.uiMessenger.sendMessage({
      type: 'USER_AUTHENTICATED',
      payload: {
        userId: event.userId,
        authenticatedAt: event.authenticatedAt,
      },
    });
  }

  /**
   * TokenRefreshedイベントを処理
   * @param event イベント
   */
  async handleTokenRefreshed(event: TokenRefreshed): Promise<void> {
    this.logger.info(`Token refreshed: ${event.userId}`);
    // UIへの通知は不要（バックグラウンド処理）
  }

  /**
   * AuthenticationFailedイベントを処理
   * @param event イベント
   */
  async handleAuthenticationFailed(event: AuthenticationFailed): Promise<void> {
    this.logger.error(`Authentication failed: ${event.errorMessage}`, new Error(event.errorCode));
    await this.uiMessenger.sendMessage({
      type: 'AUTHENTICATION_FAILED',
      payload: {
        errorCode: event.errorCode,
        errorMessage: event.errorMessage,
      },
    });
  }

  /**
   * UserLoggedOutイベントを処理
   * @param event イベント
   */
  async handleUserLoggedOut(event: UserLoggedOut): Promise<void> {
    this.logger.info(`User logged out: ${event.userId}`);
    await this.uiMessenger.sendMessage({
      type: 'USER_LOGGED_OUT',
      payload: {
        userId: event.userId,
        loggedOutAt: event.loggedOutAt,
      },
    });
  }

  /**
   * CalendarInitializedイベントを処理
   * @param event イベント
   */
  async handleCalendarInitialized(event: CalendarInitialized): Promise<void> {
    this.logger.info(`Calendar initialized: ${event.calendarId}`);
    await this.uiMessenger.sendMessage({
      type: 'CALENDAR_INITIALIZED',
      payload: {
        userId: event.userId,
        calendarId: event.calendarId,
        initializedAt: event.initializedAt,
      },
    });
  }
}
