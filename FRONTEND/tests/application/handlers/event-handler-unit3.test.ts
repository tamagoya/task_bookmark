import { EventHandler } from '../../../src/application/handlers/event-handler';
import { UIMessenger } from '../../../src/infrastructure/adapters/ui-messenger';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { TaskBookmarkCreated } from '../../../src/domain/events/task-bookmark-created';
import { TaskBookmarkUpdated } from '../../../src/domain/events/task-bookmark-updated';
import { TaskBookmarkDeleted } from '../../../src/domain/events/task-bookmark-deleted';
import { TaskBookmarkCorrupted } from '../../../src/domain/events/task-bookmark-corrupted';
import { RestoreRelationRecorded } from '../../../src/domain/events/restore-relation-recorded';
import { ValidationError } from '../../../src/domain/value-objects/validation-error';

// モック
jest.mock('../../../src/infrastructure/adapters/ui-messenger');
jest.mock('../../../src/infrastructure/adapters/logger');

describe('EventHandler (Unit 3)', () => {
  let handler: EventHandler;
  let uiMessenger: jest.Mocked<UIMessenger>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    uiMessenger = {
      sendMessage: jest.fn(),
    } as unknown as jest.Mocked<UIMessenger>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    handler = new EventHandler(uiMessenger, logger);
  });

  describe('handleTaskBookmarkCreated', () => {
    it('正常にイベントを処理できる', async () => {
      const event = new TaskBookmarkCreated('event-id-12345', '仕事名', new Date());

      await handler.handleTaskBookmarkCreated(event);

      expect(logger.info).toHaveBeenCalledWith('Task bookmark created: event-id-12345');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'TASK_BOOKMARK_CREATED',
        payload: {
          eventId: 'event-id-12345',
          title: '仕事名',
          createdAt: event.createdAt,
        },
      });
    });
  });

  describe('handleTaskBookmarkUpdated', () => {
    it('正常にイベントを処理できる', async () => {
      const event = new TaskBookmarkUpdated('event-id-12345', ['title'], new Date());

      await handler.handleTaskBookmarkUpdated(event);

      expect(logger.info).toHaveBeenCalledWith(
        'Task bookmark updated: event-id-12345, fields: title'
      );
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'TASK_BOOKMARK_UPDATED',
        payload: {
          eventId: 'event-id-12345',
          updatedFields: ['title'],
          updatedAt: event.updatedAt,
        },
      });
    });
  });

  describe('handleTaskBookmarkDeleted', () => {
    it('正常にイベントを処理できる', async () => {
      const event = new TaskBookmarkDeleted('event-id-12345', new Date());

      await handler.handleTaskBookmarkDeleted(event);

      expect(logger.info).toHaveBeenCalledWith('Task bookmark deleted: event-id-12345');
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'TASK_BOOKMARK_DELETED',
        payload: {
          eventId: 'event-id-12345',
          deletedAt: event.deletedAt,
        },
      });
    });
  });

  describe('handleTaskBookmarkCorrupted', () => {
    it('正常にイベントを処理できる', async () => {
      const errors = [
        ValidationError.create('description', 'INVALID_JSON', 'JSON形式が無効です', 'CRITICAL', false),
      ];
      const event = new TaskBookmarkCorrupted('event-id-12345', errors, new Date(), true);

      await handler.handleTaskBookmarkCorrupted(event);

      expect(logger.error).toHaveBeenCalled();
      expect(uiMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'TASK_BOOKMARK_CORRUPTED',
        payload: {
          eventId: 'event-id-12345',
          errors: [
            {
              field: 'description',
              errorCode: 'INVALID_JSON',
              errorMessage: 'JSON形式が無効です',
              severity: 'CRITICAL',
              recoverable: false,
            },
          ],
          detectedAt: event.detectedAt,
          canPartiallyLoad: true,
        },
      });
    });
  });

  describe('handleRestoreRelationRecorded', () => {
    it('正常にイベントを処理できる', async () => {
      const event = new RestoreRelationRecorded('event-id-12345', 'event-id-67890', new Date());

      await handler.handleRestoreRelationRecorded(event);

      expect(logger.info).toHaveBeenCalledWith(
        'Restore relation recorded: from event-id-12345 to event-id-67890'
      );
    });
  });
});
