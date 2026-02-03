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

  describe('updateTabs (Bolt 8: URL編集機能)', () => {
    it('タブリスト全体を更新できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newTabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/new1', title: 'New Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/new2', title: 'New Page 2', index: 1 }),
      ];
      
      const updatedWorkState = workState.updateTabs(newTabs);
      
      expect(updatedWorkState).not.toBe(workState); // 新しいインスタンス
      expect(updatedWorkState.metadata?.tabs).toHaveLength(2);
      expect(updatedWorkState.metadata?.tabs[0].url).toBe('https://example.com/new1');
      expect(updatedWorkState.metadata?.tabs[1].url).toBe('https://example.com/new2');
    });

    it('空のタブリストで更新しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.updateTabs([]);
      }).toThrow('Tab list cannot be empty');
    });

    it('インデックスが連続していないタブリストで更新しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const invalidTabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 2 }), // インデックスが飛んでいる
      ];
      
      expect(() => {
        workState.updateTabs(invalidTabs);
      }).toThrow('Tab indices must be consecutive starting from 0');
    });
  });

  describe('addTab (Bolt 8: URL編集機能)', () => {
    it('タブを追加できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newTab = TabInfo.create({ url: 'https://example.com/new', title: 'New Page', index: 1 });
      
      const updatedWorkState = workState.addTab(newTab);
      
      expect(updatedWorkState).not.toBe(workState); // 新しいインスタンス
      expect(updatedWorkState.metadata?.tabs).toHaveLength(2);
      expect(updatedWorkState.metadata?.tabs[1].url).toBe('https://example.com/new');
    });

    it('インデックスを指定してタブを追加できる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newTab = TabInfo.create({ url: 'https://example.com/new', title: 'New Page', index: 0 });
      
      const updatedWorkState = workState.addTab(newTab, 0);
      
      expect(updatedWorkState.metadata?.tabs).toHaveLength(2);
      expect(updatedWorkState.metadata?.tabs[0].url).toBe('https://example.com/new');
    });

    it('無効なTabInfoで追加しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.addTab(null as unknown as TabInfo);
      }).toThrow('Invalid tab information');
    });

    it('範囲外のインデックスで追加しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const newTab = TabInfo.create({ url: 'https://example.com/new', title: 'New Page', index: 0 });
      
      expect(() => {
        workState.addTab(newTab, 10); // 範囲外
      }).toThrow('Index out of range');
    });
  });

  describe('removeTab (Bolt 8: URL編集機能)', () => {
    it('タブを削除できる', () => {
      const tabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
        TabInfo.create({ url: 'https://example.com/3', title: 'Page 3', index: 2 }),
      ];
      const metadataWithMultipleTabs = WorkStateMetadata.create(version, tabs, new Date());
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadataWithMultipleTabs);
      
      const updatedWorkState = workState.removeTab(1);
      
      expect(updatedWorkState).not.toBe(workState); // 新しいインスタンス
      expect(updatedWorkState.metadata?.tabs).toHaveLength(2);
      expect(updatedWorkState.metadata?.tabs[0].url).toBe('https://example.com/1');
      expect(updatedWorkState.metadata?.tabs[1].url).toBe('https://example.com/3');
    });

    it('範囲外のインデックスで削除しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.removeTab(10); // 範囲外
      }).toThrow('Index out of range');
    });

    it('最後の1つのタブを削除しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.removeTab(0); // 最後の1つ
      }).toThrow('Cannot remove the last tab');
    });
  });

  describe('reorderTabs (Bolt 8: URL編集機能)', () => {
    it('タブの順序を変更できる', () => {
      const tabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
        TabInfo.create({ url: 'https://example.com/3', title: 'Page 3', index: 2 }),
      ];
      const metadataWithMultipleTabs = WorkStateMetadata.create(version, tabs, new Date());
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadataWithMultipleTabs);
      
      const updatedWorkState = workState.reorderTabs(0, 2);
      
      expect(updatedWorkState).not.toBe(workState); // 新しいインスタンス
      expect(updatedWorkState.metadata?.tabs).toHaveLength(3);
      expect(updatedWorkState.metadata?.tabs[0].url).toBe('https://example.com/2');
      expect(updatedWorkState.metadata?.tabs[1].url).toBe('https://example.com/3');
      expect(updatedWorkState.metadata?.tabs[2].url).toBe('https://example.com/1');
    });

    it('範囲外のインデックスで順序変更しようとするとエラーを投げる', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      expect(() => {
        workState.reorderTabs(0, 10); // 範囲外
      }).toThrow('Index out of range');
    });
  });

  describe('validateTabList (Bolt 8: URL編集機能)', () => {
    it('有効なタブリストはエラーを返さない', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const validTabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
      ];
      
      const errors = workState.validateTabList(validTabs);
      
      expect(errors).toHaveLength(0);
    });

    it('空のタブリストはエラーを返す', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      
      const errors = workState.validateTabList([]);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].errorCode).toBe('EMPTY_TAB_LIST');
    });

    it('インデックスが連続していないタブリストはエラーを返す', () => {
      const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);
      const invalidTabs: TabInfo[] = [
        TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
        TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 2 }), // インデックスが飛んでいる
      ];
      
      const errors = workState.validateTabList(invalidTabs);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.errorCode === 'INVALID_TAB_INDICES')).toBe(true);
    });
  });
});
