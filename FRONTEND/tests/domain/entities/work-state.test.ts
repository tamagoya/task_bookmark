import { WorkState } from '../../../src/domain/entities/work-state';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { EventDescription } from '../../../src/domain/value-objects/event-description';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { ValidationError } from '../../../src/domain/value-objects/validation-error';

describe('WorkState', () => {
  const eventId = EventId.create('event-id-12345');
  const title = EventTitle.create('仕事名');
  const startTime = new Date('2026-01-21T10:00:00Z');
  const endTime = new Date('2026-01-21T11:00:00Z');
  const mockTabs: TabInfo[] = [
    TabInfo.create({
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    }),
  ];
  const version = SchemaVersion.create(1, 0, 0);
  const metadata = WorkStateMetadata.create(version, mockTabs, new Date());
  const description = EventDescription.create(metadata);

  describe('作成', () => {
    it('有効な仕事状態で作成できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(workState).toBeDefined();
      expect(workState.eventId).toEqual(eventId);
      expect(workState.title).toEqual(title);
      expect(workState.description).toEqual(description);
      expect(workState.metadata).toEqual(metadata);
    });

    it('開始時刻が終了時刻より後の場合はエラーを投げる', () => {
      expect(() => {
        WorkState.create(eventId, title, description, endTime, startTime, metadata);
      }).toThrow('WorkState startTime must be before endTime');
    });
  });

  describe('updateTitle', () => {
    it('タイトルを更新できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newTitle = EventTitle.create('新しい仕事名');
      
      workState.updateTitle(newTitle);
      
      expect(workState.title).toEqual(newTitle);
    });

    it('nullのタイトルで更新しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.updateTitle(null as unknown as EventTitle);
      }).toThrow('WorkState title cannot be null');
    });
  });

  describe('updateMetadata', () => {
    it('メタデータを更新できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newMetadata = WorkStateMetadata.create(version, mockTabs, new Date(), '新しいメモ');
      
      workState.updateMetadata(newMetadata);
      
      expect(workState.metadata).toEqual(newMetadata);
    });

    it('nullのメタデータで更新しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.updateMetadata(null as unknown as WorkStateMetadata);
      }).toThrow('WorkState metadata cannot be null');
    });
  });

  describe('markAsCorrupted', () => {
    it('破損データとしてマークできる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const errors = [
        ValidationError.create('description', 'INVALID_JSON', 'JSON形式が無効です', 'CRITICAL', false),
      ];
      
      workState.markAsCorrupted(errors);
      
      expect(workState.isCorrupted).toBe(true);
      expect(workState.validationErrors).toHaveLength(1);
    });

    it('空のエラーリストでマークしようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.markAsCorrupted([]);
      }).toThrow('WorkState errors cannot be empty when marking as corrupted');
    });
  });

  describe('getCorruptedFields', () => {
    it('破損フィールドのリストを取得できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const errors = [
        ValidationError.create('description', 'INVALID_JSON', 'JSON形式が無効です', 'CRITICAL', false),
        ValidationError.create('metadata', 'MISSING_FIELD', '必須フィールドが欠落しています', 'WARNING', true),
      ];
      
      workState.markAsCorrupted(errors);
      const corruptedFields = workState.getCorruptedFields();
      
      expect(corruptedFields).toContain('description');
      expect(corruptedFields).toContain('metadata');
    });
  });

  describe('canPartiallyLoad', () => {
    it('タイトルとイベントIDが有効な場合は部分的に読み込み可能', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(workState.canPartiallyLoad()).toBe(true);
    });
  });
});
