import { TabsUpdated } from '../../../src/domain/events/tabs-updated';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TabsUpdated (Bolt 8: URL編集機能)', () => {
  const mockTabs: TabInfo[] = [
    TabInfo.create({ url: 'https://example.com/1', title: 'Page 1', index: 0 }),
    TabInfo.create({ url: 'https://example.com/2', title: 'Page 2', index: 1 }),
  ];

  describe('作成', () => {
    it('有効なパラメータで作成できる', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'update');
      
      expect(event.eventId).toBe('event-id-123');
      expect(event.updatedTabs).toHaveLength(2);
      expect(event.operationType).toBe('update');
      expect(event.tabCount).toBe(2);
    });

    it('operationDetailsを指定して作成できる', () => {
      const addedTab = TabInfo.create({ url: 'https://example.com/new', title: 'New Page', index: 2 });
      const event = new TabsUpdated(
        'event-id-123',
        [...mockTabs, addedTab],
        'add',
        { addedTab, toIndex: 2 }
      );
      
      expect(event.operationDetails?.addedTab).toBe(addedTab);
      expect(event.operationDetails?.toIndex).toBe(2);
    });

    it('updatedAtを指定して作成できる', () => {
      const customDate = new Date('2026-01-21T10:00:00Z');
      const event = new TabsUpdated('event-id-123', mockTabs, 'update', undefined, customDate);
      
      expect(event.updatedAt).toEqual(customDate);
    });
  });

  describe('operationType', () => {
    it('updateで作成できる', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'update');
      expect(event.operationType).toBe('update');
    });

    it('addで作成できる', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'add');
      expect(event.operationType).toBe('add');
    });

    it('removeで作成できる', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'remove');
      expect(event.operationType).toBe('remove');
    });

    it('reorderで作成できる', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'reorder');
      expect(event.operationType).toBe('reorder');
    });
  });

  describe('バリデーション', () => {
    it('空のupdatedTabs配列でエラーを投げる', () => {
      expect(() => {
        new TabsUpdated('event-id-123', [], 'update');
      }).toThrow('Updated tabs array cannot be empty');
    });

    it('空のeventIdでエラーを投げる', () => {
      expect(() => {
        new TabsUpdated('', mockTabs, 'update');
      }).toThrow('Event ID cannot be empty');
    });

    it('空白のみのeventIdでエラーを投げる', () => {
      expect(() => {
        new TabsUpdated('   ', mockTabs, 'update');
      }).toThrow('Event ID cannot be empty');
    });

    it('無効なoperationTypeでエラーを投げる', () => {
      expect(() => {
        new TabsUpdated('event-id-123', mockTabs, 'invalid' as 'update');
      }).toThrow('Invalid operation type: invalid');
    });
  });

  describe('tabCount', () => {
    it('正しいタブ数を返す', () => {
      const event = new TabsUpdated('event-id-123', mockTabs, 'update');
      expect(event.tabCount).toBe(2);
    });

    it('1つのタブで正しいタブ数を返す', () => {
      const singleTab = [TabInfo.create({ url: 'https://example.com', title: 'Page', index: 0 })];
      const event = new TabsUpdated('event-id-123', singleTab, 'update');
      expect(event.tabCount).toBe(1);
    });
  });
});
