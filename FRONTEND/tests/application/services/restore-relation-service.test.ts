import { RestoreRelationService } from '../../../src/application/services/restore-relation-service';
import { CalendarEventRepository } from '../../../src/domain/repositories/calendar-event-repository';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { Logger } from '../../../src/infrastructure/adapters/logger';

// モック
jest.mock('../../../src/domain/repositories/calendar-event-repository');
jest.mock('../../../src/infrastructure/adapters/logger');

describe('RestoreRelationService', () => {
  let service: RestoreRelationService;
  let repository: jest.Mocked<CalendarEventRepository>;
  let logger: jest.Mocked<Logger>;

  const calendarId = CalendarId.create('calendar-id-12345');
  const accessToken = AccessToken.create('valid-access-token-12345');
  const tabs: TabInfo[] = [
    TabInfo.create({
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    }),
  ];

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<CalendarEventRepository>;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    service = new RestoreRelationService(repository, logger);
  });

  describe('getRestoreRelations', () => {
    it('復元元と復元先の両方がある場合、正しく取得できる', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-22T10:00:00Z');
      const endTime = new Date('2026-01-22T11:00:00Z');
      
      // 現在のWorkState（復元元と復元先がある）
      const currentMetadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredFrom: 'restored-from-event-id',
          restoredTo: [
            { eventId: 'restored-to-event-id-1', restoredAt: '2026-01-23T14:00:00Z' },
            { eventId: 'restored-to-event-id-2', restoredAt: '2026-01-24T09:00:00Z' },
          ],
        },
        version
      );
      const currentWorkState = WorkState.create(
        eventId,
        EventTitle.create('現在の仕事'),
        null,
        startTime,
        endTime,
        currentMetadata
      );

      // 復元元のWorkState
      const restoredFromMetadata = WorkStateMetadata.create(version, tabs, new Date('2026-01-21T15:00:00Z'));
      const restoredFromWorkState = WorkState.create(
        EventId.create('restored-from-event-id'),
        EventTitle.create('復元元の仕事'),
        null,
        new Date('2026-01-21T15:00:00Z'),
        new Date('2026-01-21T16:00:00Z'),
        restoredFromMetadata
      );

      // 復元先1のWorkState
      const restoredTo1Metadata = WorkStateMetadata.create(version, tabs, new Date('2026-01-23T14:00:00Z'));
      const restoredTo1WorkState = WorkState.create(
        EventId.create('restored-to-event-id-1'),
        EventTitle.create('復元先1の仕事'),
        null,
        new Date('2026-01-23T14:00:00Z'),
        new Date('2026-01-23T15:00:00Z'),
        restoredTo1Metadata
      );

      // 復元先2のWorkState
      const restoredTo2Metadata = WorkStateMetadata.create(version, tabs, new Date('2026-01-24T09:00:00Z'));
      const restoredTo2WorkState = WorkState.create(
        EventId.create('restored-to-event-id-2'),
        EventTitle.create('復元先2の仕事'),
        null,
        new Date('2026-01-24T09:00:00Z'),
        new Date('2026-01-24T10:00:00Z'),
        restoredTo2Metadata
      );

      repository.findById
        .mockResolvedValueOnce(currentWorkState) // 現在のWorkState
        .mockResolvedValueOnce(restoredFromWorkState) // 復元元
        .mockResolvedValueOnce(restoredTo1WorkState) // 復元先1
        .mockResolvedValueOnce(restoredTo2WorkState); // 復元先2

      const result = await service.getRestoreRelations(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toBeDefined();
      expect(result.restoredFrom?.eventId).toBe('restored-from-event-id');
      expect(result.restoredFrom?.title).toBe('復元元の仕事');
      expect(result.restoredTo).toHaveLength(2);
      expect(result.restoredTo[0].eventId).toBe('restored-to-event-id-1');
      expect(result.restoredTo[0].title).toBe('復元先1の仕事');
      expect(result.restoredTo[0].restoredAt).toBe('2026-01-23T14:00:00Z');
      expect(result.restoredTo[1].eventId).toBe('restored-to-event-id-2');
      expect(result.restoredTo[1].title).toBe('復元先2の仕事');
      expect(result.restoredTo[1].restoredAt).toBe('2026-01-24T09:00:00Z');
    });

    it('復元元がない場合（最初の保存）、restoredFromはnull', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-22T10:00:00Z');
      const endTime = new Date('2026-01-22T11:00:00Z');
      
      // 現在のWorkState（復元元がない）
      const currentMetadata = WorkStateMetadata.create(version, tabs, startTime);
      const currentWorkState = WorkState.create(
        eventId,
        EventTitle.create('最初の仕事'),
        null,
        startTime,
        endTime,
        currentMetadata
      );

      repository.findById.mockResolvedValueOnce(currentWorkState);

      const result = await service.getRestoreRelations(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toBeNull();
      expect(result.restoredTo).toHaveLength(0);
    });

    it('復元先がない場合、restoredToは空配列', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-22T10:00:00Z');
      const endTime = new Date('2026-01-22T11:00:00Z');
      
      // 現在のWorkState（復元先がない）
      const currentMetadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredFrom: 'restored-from-event-id',
        },
        version
      );
      const currentWorkState = WorkState.create(
        eventId,
        EventTitle.create('現在の仕事'),
        null,
        startTime,
        endTime,
        currentMetadata
      );

      // 復元元のWorkState
      const restoredFromMetadata = WorkStateMetadata.create(version, tabs, new Date('2026-01-21T15:00:00Z'));
      const restoredFromWorkState = WorkState.create(
        EventId.create('restored-from-event-id'),
        EventTitle.create('復元元の仕事'),
        null,
        new Date('2026-01-21T15:00:00Z'),
        new Date('2026-01-21T16:00:00Z'),
        restoredFromMetadata
      );

      repository.findById
        .mockResolvedValueOnce(currentWorkState)
        .mockResolvedValueOnce(restoredFromWorkState);

      const result = await service.getRestoreRelations(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toBeDefined();
      expect(result.restoredTo).toHaveLength(0);
    });

    it('存在しないイベントIDの場合、エラーを投げる', async () => {
      const eventId = EventId.create('non-existent-event-id');
      repository.findById.mockResolvedValueOnce(null);

      await expect(
        service.getRestoreRelations(eventId, calendarId, accessToken)
      ).rejects.toThrow('WorkState not found: non-existent-event-id');
    });

    it('復元元のイベントが存在しない場合、restoredFromはnull', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-22T10:00:00Z');
      const endTime = new Date('2026-01-22T11:00:00Z');
      
      // 現在のWorkState（復元元のIDがあるが、実際には存在しない）
      const currentMetadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredFrom: 'non-existent-restored-from-id',
        },
        version
      );
      const currentWorkState = WorkState.create(
        eventId,
        EventTitle.create('現在の仕事'),
        null,
        startTime,
        endTime,
        currentMetadata
      );

      repository.findById
        .mockResolvedValueOnce(currentWorkState) // 現在のWorkState
        .mockResolvedValueOnce(null); // 復元元が存在しない

      const result = await service.getRestoreRelations(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toBeNull();
      expect(result.restoredTo).toHaveLength(0);
    });

    it('復元先のイベントが存在しない場合、その復元先はスキップされる', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-22T10:00:00Z');
      const endTime = new Date('2026-01-22T11:00:00Z');
      
      // 現在のWorkState（復元先のIDがあるが、一部が存在しない）
      const currentMetadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredTo: [
            { eventId: 'restored-to-event-id-1', restoredAt: '2026-01-23T14:00:00Z' },
            { eventId: 'non-existent-restored-to-id', restoredAt: '2026-01-24T09:00:00Z' },
          ],
        },
        version
      );
      const currentWorkState = WorkState.create(
        eventId,
        EventTitle.create('現在の仕事'),
        null,
        startTime,
        endTime,
        currentMetadata
      );

      // 復元先1のWorkState（存在する）
      const restoredTo1Metadata = WorkStateMetadata.create(version, tabs, new Date('2026-01-23T14:00:00Z'));
      const restoredTo1WorkState = WorkState.create(
        EventId.create('restored-to-event-id-1'),
        EventTitle.create('復元先1の仕事'),
        null,
        new Date('2026-01-23T14:00:00Z'),
        new Date('2026-01-23T15:00:00Z'),
        restoredTo1Metadata
      );

      repository.findById
        .mockResolvedValueOnce(currentWorkState) // 現在のWorkState
        .mockResolvedValueOnce(restoredTo1WorkState) // 復元先1（存在する）
        .mockResolvedValueOnce(null); // 復元先2（存在しない）

      const result = await service.getRestoreRelations(eventId, calendarId, accessToken);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toBeNull();
      expect(result.restoredTo).toHaveLength(1); // 存在する復元先のみ
      expect(result.restoredTo[0].eventId).toBe('restored-to-event-id-1');
    });
  });
});
