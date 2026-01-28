import { WorkStateFactory } from '../../../src/domain/factories/work-state-factory';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { ValidationError } from '../../../src/domain/value-objects/validation-error';

describe('WorkStateFactory', () => {
  const eventId = EventId.create('event-id-12345');
  const title = EventTitle.create('仕事名');
  const tabs: TabInfo[] = [
    {
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    },
  ];
  const startTime = new Date('2026-01-21T10:00:00Z');
  const endTime = new Date('2026-01-21T11:00:00Z');

  describe('createFromTabs', () => {
    it('タブ情報からWorkStateを作成できる', () => {
      const workState = WorkStateFactory.createFromTabs(
        eventId,
        title,
        tabs,
        startTime,
        endTime
      );
      
      expect(workState).toBeDefined();
      expect(workState.eventId).toEqual(eventId);
      expect(workState.title).toEqual(title);
      expect(workState.metadata).toBeDefined();
      expect(workState.metadata?.tabs).toHaveLength(1);
    });

    it('メモ付きで作成できる', () => {
      const memo = '作業メモ';
      const workState = WorkStateFactory.createFromTabs(
        eventId,
        title,
        tabs,
        startTime,
        endTime,
        memo
      );
      
      expect(workState.metadata?.memo).toBe(memo);
    });

    it('空のタブ配列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        WorkStateFactory.createFromTabs(eventId, title, [], startTime, endTime);
      }).toThrow('WorkState tabs must contain at least one tab');
    });

    it('開始時刻が終了時刻より後の場合はエラーを投げる', () => {
      expect(() => {
        WorkStateFactory.createFromTabs(eventId, title, tabs, endTime, startTime);
      }).toThrow('WorkState startTime must be before endTime');
    });
  });

  describe('createFromCalendarEvent', () => {
    it('有効なカレンダーイベントからWorkStateを作成できる', () => {
      const description = JSON.stringify({
        version: '1.0.0',
        tabs: tabs,
        savedAt: new Date().toISOString(),
      });
      
      const workState = WorkStateFactory.createFromCalendarEvent(
        eventId,
        '仕事名',
        description,
        startTime,
        endTime
      );
      
      expect(workState).toBeDefined();
      expect(workState.eventId).toEqual(eventId);
      expect(workState.isCorrupted).toBe(false);
    });

    it('破損したカレンダーイベントからWorkStateを作成できる（部分的に読み込み）', () => {
      const invalidDescription = 'invalid-json';
      
      const workState = WorkStateFactory.createFromCalendarEvent(
        eventId,
        '仕事名',
        invalidDescription,
        startTime,
        endTime
      );
      
      expect(workState).toBeDefined();
      expect(workState.isCorrupted).toBe(true);
      expect(workState.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('createFromCorruptedEvent', () => {
    it('破損したカレンダーイベントからWorkStateを作成できる', () => {
      const errors = [
        ValidationError.create('description', 'INVALID_JSON', 'JSON形式が無効です', 'CRITICAL', false),
      ];
      
      const workState = WorkStateFactory.createFromCorruptedEvent(
        eventId,
        '仕事名',
        null,
        startTime,
        endTime,
        errors
      );
      
      expect(workState).toBeDefined();
      expect(workState.isCorrupted).toBe(true);
      expect(workState.validationErrors).toEqual(errors);
    });

    it('空のエラーリストで作成しようとするとエラーを投げる', () => {
      expect(() => {
        WorkStateFactory.createFromCorruptedEvent(eventId, '仕事名', null, startTime, endTime, []);
      }).toThrow('WorkStateFactory createFromCorruptedEvent requires at least one error');
    });
  });

  describe('createWithRestoreRelation', () => {
    it('復元関係を含むWorkStateを作成できる', () => {
      const restoredFromEventId = EventId.create('event-id-67890');
      
      const workState = WorkStateFactory.createWithRestoreRelation(
        eventId,
        title,
        tabs,
        startTime,
        endTime,
        restoredFromEventId
      );
      
      expect(workState).toBeDefined();
      expect(workState.metadata?.restoredFrom).toBe(restoredFromEventId.value);
    });
  });
});
