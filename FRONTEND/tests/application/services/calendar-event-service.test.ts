import { CalendarEventService } from '../../../src/application/services/calendar-event-service';
import { CalendarEventRepository } from '../../../src/domain/repositories/calendar-event-repository';
import { EventHandler } from '../../../src/application/handlers/event-handler';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';

// モック
jest.mock('../../../src/domain/repositories/calendar-event-repository');
jest.mock('../../../src/application/handlers/event-handler');

describe('CalendarEventService', () => {
  let service: CalendarEventService;
  let repository: jest.Mocked<CalendarEventRepository>;
  let eventHandler: jest.Mocked<EventHandler>;

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
      save: jest.fn(),
      findById: jest.fn(),
      findByDateRange: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      patchDescriptionToIncludeEventId: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CalendarEventRepository>;

    eventHandler = {
      handleTaskBookmarkCreated: jest.fn(),
      handleTaskBookmarkUpdated: jest.fn(),
      handleTaskBookmarkDeleted: jest.fn(),
    } as unknown as jest.Mocked<EventHandler>;

    service = new CalendarEventService(repository, eventHandler);
  });

  describe('createWorkStateEvent', () => {
    it('正常に仕事状態を保存できる', async () => {
      const eventId = EventId.create('event-id-12345');
      repository.save.mockResolvedValue(eventId);

      const beforeCall = Date.now();
      const result = await service.createWorkStateEvent(
        tabs,
        '仕事名',
        calendarId,
        accessToken
      );
      const afterCall = Date.now();

      expect(result).toEqual(eventId);
      expect(repository.save).toHaveBeenCalled();
      expect(repository.patchDescriptionToIncludeEventId).toHaveBeenCalledWith(
        eventId,
        calendarId,
        accessToken
      );
      expect(eventHandler.handleTaskBookmarkCreated).toHaveBeenCalled();

      // 時間計算の確認: 終了時間は現在時刻、開始時間は30分前
      const saveCall = repository.save.mock.calls[0];
      const workState = saveCall[0] as WorkState;
      const endTime = workState.endTime.getTime();
      const startTime = workState.startTime.getTime();
      const duration = endTime - startTime;

      // 終了時間は現在時刻の前後1秒以内
      expect(endTime).toBeGreaterThanOrEqual(beforeCall - 1000);
      expect(endTime).toBeLessThanOrEqual(afterCall + 1000);

      // 開始時間は終了時間の30分前（30分 = 30 * 60 * 1000 ms）
      expect(duration).toBe(30 * 60 * 1000);
    });

    it('メモ付きで仕事状態を保存できる', async () => {
      const eventId = EventId.create('event-id-12345');
      repository.save.mockResolvedValue(eventId);

      const result = await service.createWorkStateEvent(
        tabs,
        '仕事名',
        calendarId,
        accessToken,
        '作業メモ'
      );

      expect(result).toEqual(eventId);
      expect(repository.save).toHaveBeenCalled();
    });

    it('復元元のイベントIDを指定して保存できる（Bolt 7）', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredFromEventId = EventId.create('restored-from-event-id');
      repository.save.mockResolvedValue(eventId);

      const result = await service.createWorkStateEvent(
        tabs,
        '仕事名',
        calendarId,
        accessToken,
        undefined,
        restoredFromEventId
      );

      expect(result).toEqual(eventId);
      expect(repository.save).toHaveBeenCalled();
      
      // 保存されたWorkStateのメタデータにrestoredFromが設定されていることを確認
      const saveCall = repository.save.mock.calls[0];
      const workState = saveCall[0] as WorkState;
      expect(workState.metadata?.restoredFrom).toBe(restoredFromEventId.value);
    });

    it('復元時刻を指定して保存する場合、その時刻がstartTimeになる（Bolt 7）', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredFromEventId = EventId.create('restored-from-event-id');
      const restoredAtTime = new Date('2026-01-22T10:30:00Z');
      repository.save.mockResolvedValue(eventId);

      const beforeCall = Date.now();
      const result = await service.createWorkStateEvent(
        tabs,
        '仕事名',
        calendarId,
        accessToken,
        undefined,
        restoredFromEventId,
        restoredAtTime
      );
      const afterCall = Date.now();

      expect(result).toEqual(eventId);
      expect(repository.save).toHaveBeenCalled();
      
      // 保存されたWorkStateの時間を確認
      const saveCall = repository.save.mock.calls[0];
      const workState = saveCall[0] as WorkState;
      
      // startTimeは復元時刻と一致
      expect(workState.startTime.getTime()).toBe(restoredAtTime.getTime());
      
      // endTimeは現在時刻（前後1秒以内）
      expect(workState.endTime.getTime()).toBeGreaterThanOrEqual(beforeCall - 1000);
      expect(workState.endTime.getTime()).toBeLessThanOrEqual(afterCall + 1000);
    });
  });

  describe('getWorkStateEvents', () => {
    it('正常に仕事状態の一覧を取得できる', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');
      const workStates: WorkState[] = [];
      repository.findByDateRange.mockResolvedValue(workStates);

      const result = await service.getWorkStateEvents(
        startDate,
        endDate,
        calendarId,
        accessToken
      );

      expect(result).toEqual(workStates);
      expect(repository.findByDateRange).toHaveBeenCalledWith(
        startDate,
        endDate,
        calendarId,
        accessToken
      );
    });
  });

  describe('updateWorkStateEvent', () => {
    it('正常に仕事状態を更新できる', async () => {
      const eventId = EventId.create('event-id-12345');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );
      repository.findById.mockResolvedValue(workState);
      repository.update.mockResolvedValue();

      const newTitle = EventTitle.create('新しい仕事名');
      await service.updateWorkStateEvent(
        eventId,
        { title: newTitle },
        calendarId,
        accessToken
      );

      expect(repository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(repository.update).toHaveBeenCalled();
      expect(eventHandler.handleTaskBookmarkUpdated).toHaveBeenCalled();
    });

    it('存在しないイベントIDで更新しようとするとエラーを投げる', async () => {
      const eventId = EventId.create('event-id-12345');
      repository.findById.mockResolvedValue(null);

      await expect(
        service.updateWorkStateEvent(eventId, {}, calendarId, accessToken)
      ).rejects.toThrow('WorkState not found');
    });
  });

  describe('deleteWorkStateEvent', () => {
    it('正常に仕事状態を削除できる', async () => {
      const eventId = EventId.create('event-id-12345');
      repository.delete.mockResolvedValue();

      await service.deleteWorkStateEvent(eventId, calendarId, accessToken);

      expect(repository.delete).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(eventHandler.handleTaskBookmarkDeleted).toHaveBeenCalled();
    });
  });

  describe('recordRestore', () => {
    it('正常に復元メタデータを記録できる（イベントIDと復元日時のペア）', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredToEventId = EventId.create('restored-event-id-67890');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const metadata = WorkStateMetadata.create(version, tabs, startTime);
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );
      repository.findById.mockResolvedValue(workState);
      repository.update.mockResolvedValue();

      const restoredAt = new Date('2026-01-22T10:00:00Z');
      await service.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken);

      expect(repository.findById).toHaveBeenCalledWith(eventId, calendarId, accessToken);
      expect(repository.update).toHaveBeenCalled();
      
      // 更新されたWorkStateのメタデータを確認
      const updateCall = repository.update.mock.calls[0];
      const updatedWorkState = updateCall[0] as WorkState;
      expect(updatedWorkState.metadata?.restoredTo).toHaveLength(1);
      expect(updatedWorkState.metadata?.restoredTo?.[0]).toEqual({
        eventId: restoredToEventId.value,
        restoredAt: restoredAt.toISOString(),
      });
    });

    it('既存のrestoredToに復元情報を追加できる', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredToEventId = EventId.create('restored-event-id-67890');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const existingRestoredTo = [
        { eventId: 'existing-restored-id', restoredAt: '2026-01-21T12:00:00Z' }
      ];
      const metadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredTo: existingRestoredTo,
        },
        version
      );
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );
      repository.findById.mockResolvedValue(workState);
      repository.update.mockResolvedValue();

      const restoredAt = new Date('2026-01-22T10:00:00Z');
      await service.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken);

      // 更新されたWorkStateのメタデータを確認
      const updateCall = repository.update.mock.calls[0];
      const updatedWorkState = updateCall[0] as WorkState;
      expect(updatedWorkState.metadata?.restoredTo).toHaveLength(2);
      expect(updatedWorkState.metadata?.restoredTo?.[0]).toEqual(existingRestoredTo[0]);
      expect(updatedWorkState.metadata?.restoredTo?.[1]).toEqual({
        eventId: restoredToEventId.value,
        restoredAt: restoredAt.toISOString(),
      });
    });

    it('後方互換性: 旧形式（文字列配列）のrestoredToを正しく読み込める', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredToEventId = EventId.create('restored-event-id-67890');
      const version = SchemaVersion.create(1, 0, 0);
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      // 旧形式: 文字列配列
      const existingRestoredTo = ['2026-01-21T12:00:00Z'];
      const metadata = WorkStateMetadata.createFromRaw(
        {
          version: version.toString(),
          tabs: tabs.map(tab => ({
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.faviconUrl,
            index: tab.index,
          })),
          savedAt: startTime.toISOString(),
          restoredTo: existingRestoredTo,
        },
        version
      );
      const workState = WorkState.create(
        eventId,
        EventTitle.create('仕事名'),
        null,
        startTime,
        endTime,
        metadata
      );
      repository.findById.mockResolvedValue(workState);
      repository.update.mockResolvedValue();

      const restoredAt = new Date('2026-01-22T10:00:00Z');
      await service.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken);

      // 更新されたWorkStateのメタデータを確認
      const updateCall = repository.update.mock.calls[0];
      const updatedWorkState = updateCall[0] as WorkState;
      expect(updatedWorkState.metadata?.restoredTo).toHaveLength(2);
      // 旧形式はeventIdが空文字として変換される
      expect(updatedWorkState.metadata?.restoredTo?.[0]).toEqual({
        eventId: '',
        restoredAt: '2026-01-21T12:00:00Z',
      });
      expect(updatedWorkState.metadata?.restoredTo?.[1]).toEqual({
        eventId: restoredToEventId.value,
        restoredAt: restoredAt.toISOString(),
      });
    });

    it('存在しないイベントIDで復元を記録しようとするとエラーを投げる', async () => {
      const eventId = EventId.create('event-id-12345');
      const restoredToEventId = EventId.create('restored-event-id-67890');
      repository.findById.mockResolvedValue(null);

      const restoredAt = new Date('2026-01-22T10:00:00Z');
      await expect(
        service.recordRestore(eventId, restoredToEventId, restoredAt, calendarId, accessToken)
      ).rejects.toThrow('WorkState not found');
    });
  });
});
