import { UserAuthenticated } from '../../domain/events/user-authenticated';
import { TokenRefreshed } from '../../domain/events/token-refreshed';
import { AuthenticationFailed } from '../../domain/events/authentication-failed';
import { UserLoggedOut } from '../../domain/events/user-logged-out';
import { CalendarInitialized } from '../../domain/events/calendar-initialized';
import { TaskBookmarkCreated } from '../../domain/events/task-bookmark-created';
import { TaskBookmarkUpdated } from '../../domain/events/task-bookmark-updated';
import { TaskBookmarkDeleted } from '../../domain/events/task-bookmark-deleted';
import { TaskBookmarkCorrupted } from '../../domain/events/task-bookmark-corrupted';
import { RestoreRelationRecorded } from '../../domain/events/restore-relation-recorded';
import { TabsCaptured } from '../../domain/events/tabs-captured';
import { TabsUpdated } from '../../domain/events/tabs-updated';
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

  /**
   * TaskBookmarkCreatedイベントを処理
   * @param event イベント
   */
  async handleTaskBookmarkCreated(event: TaskBookmarkCreated): Promise<void> {
    this.logger.info(`Task bookmark created: ${event.eventId}`);
    await this.uiMessenger.sendMessage({
      type: 'TASK_BOOKMARK_CREATED',
      payload: {
        eventId: event.eventId,
        title: event.title,
        createdAt: event.createdAt,
      },
    });
  }

  /**
   * TaskBookmarkUpdatedイベントを処理
   * @param event イベント
   */
  async handleTaskBookmarkUpdated(event: TaskBookmarkUpdated): Promise<void> {
    this.logger.info(`Task bookmark updated: ${event.eventId}, fields: ${event.updatedFields.join(', ')}`);
    await this.uiMessenger.sendMessage({
      type: 'TASK_BOOKMARK_UPDATED',
      payload: {
        eventId: event.eventId,
        updatedFields: event.updatedFields,
        updatedAt: event.updatedAt,
      },
    });
  }

  /**
   * TaskBookmarkDeletedイベントを処理
   * @param event イベント
   */
  async handleTaskBookmarkDeleted(event: TaskBookmarkDeleted): Promise<void> {
    this.logger.info(`Task bookmark deleted: ${event.eventId}`);
    await this.uiMessenger.sendMessage({
      type: 'TASK_BOOKMARK_DELETED',
      payload: {
        eventId: event.eventId,
        deletedAt: event.deletedAt,
      },
    });
  }

  /**
   * TaskBookmarkCorruptedイベントを処理
   * @param event イベント
   */
  async handleTaskBookmarkCorrupted(event: TaskBookmarkCorrupted): Promise<void> {
    this.logger.error(
      `Task bookmark corrupted: ${event.eventId}, errors: ${event.errors.map((e) => e.errorMessage).join(', ')}`
    );
    await this.uiMessenger.sendMessage({
      type: 'TASK_BOOKMARK_CORRUPTED',
      payload: {
        eventId: event.eventId,
        errors: event.errors.map((e) => ({
          field: e.field,
          errorCode: e.errorCode,
          errorMessage: e.errorMessage,
          severity: e.severity,
          recoverable: e.recoverable,
        })),
        detectedAt: event.detectedAt,
        canPartiallyLoad: event.canPartiallyLoad,
      },
    });
  }

  /**
   * RestoreRelationRecordedイベントを処理
   * @param event イベント
   */
  async handleRestoreRelationRecorded(event: RestoreRelationRecorded): Promise<void> {
    this.logger.info(
      `Restore relation recorded: from ${event.fromEventId} to ${event.toEventId}`
    );
    // UIへの通知は不要（バックグラウンド処理）
  }

  /**
   * TabsCapturedイベントを処理
   * @param event イベント
   */
  async handleTabsCaptured(event: TabsCaptured): Promise<void> {
    this.logger.info(`Tabs captured: ${event.tabCount} tabs in window ${event.windowId}`);
    await this.uiMessenger.sendMessage({
      type: 'TABS_CAPTURED',
      payload: {
        tabs: event.tabs.map((tab) => ({
          url: tab.url,
          title: tab.title,
          faviconUrl: tab.faviconUrl,
          index: tab.index,
          extensions: tab.extensions,
        })),
        windowId: event.windowId,
        capturedAt: event.capturedAt,
        tabCount: event.tabCount,
      },
    });
  }

  /**
   * TabsUpdatedイベントを処理（Bolt 8: URL編集機能）
   * @param event イベント
   */
  async handleTabsUpdated(event: TabsUpdated): Promise<void> {
    this.logger.info(
      `Tabs updated: ${event.eventId}, operation: ${event.operationType}, tabCount: ${event.tabCount}`
    );
    await this.uiMessenger.sendMessage({
      type: 'TABS_UPDATED',
      payload: {
        eventId: event.eventId,
        updatedTabs: event.updatedTabs.map((tab) => ({
          url: tab.url,
          title: tab.title,
          faviconUrl: tab.faviconUrl,
          index: tab.index,
          extensions: tab.extensions,
        })),
        operationType: event.operationType,
        operationDetails: event.operationDetails,
        updatedAt: event.updatedAt,
        tabCount: event.tabCount,
      },
    });
  }
}
