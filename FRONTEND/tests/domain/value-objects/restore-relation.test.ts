import { RestoreRelation } from '../../../src/domain/value-objects/restore-relation';

describe('RestoreRelation', () => {
  describe('作成', () => {
    it('有効なデータで作成できる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const relation = RestoreRelation.create(data);

      expect(relation).toBeDefined();
      expect(relation.eventId).toBe(data.eventId);
      expect(relation.title).toBe(data.title);
      expect(relation.savedAt).toBe(data.savedAt);
      expect(relation.restoredAt).toBeUndefined();
    });

    it('復元日時を含むデータで作成できる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: '2026-01-23T14:00:00Z',
      };
      const relation = RestoreRelation.create(data);

      expect(relation).toBeDefined();
      expect(relation.eventId).toBe(data.eventId);
      expect(relation.title).toBe(data.title);
      expect(relation.savedAt).toBe(data.savedAt);
      expect(relation.restoredAt).toBe(data.restoredAt);
    });

    it('空のイベントIDで作成しようとするとエラーを投げる', () => {
      const data = {
        eventId: '',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };

      expect(() => {
        RestoreRelation.create(data);
      }).toThrow('RestoreRelation eventId cannot be empty');
    });

    it('空のタイトルで作成しようとするとエラーを投げる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: '',
        savedAt: '2026-01-22T10:00:00Z',
      };

      expect(() => {
        RestoreRelation.create(data);
      }).toThrow('RestoreRelation title cannot be empty');
    });

    it('空の保存日時で作成しようとするとエラーを投げる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '',
      };

      expect(() => {
        RestoreRelation.create(data);
      }).toThrow('RestoreRelation savedAt cannot be empty');
    });

    it('無効なISO 8601形式の保存日時で作成しようとするとエラーを投げる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: 'invalid-date',
      };

      expect(() => {
        RestoreRelation.create(data);
      }).toThrow('RestoreRelation savedAt must be a valid ISO 8601 date string');
    });

    it('無効なISO 8601形式の復元日時で作成しようとするとエラーを投げる', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: 'invalid-date',
      };

      expect(() => {
        RestoreRelation.create(data);
      }).toThrow('RestoreRelation restoredAt must be a valid ISO 8601 date string');
    });
  });

  describe('等価性', () => {
    it('同じデータのRestoreRelationは等しい', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const relation1 = RestoreRelation.create(data);
      const relation2 = RestoreRelation.create(data);

      expect(relation1.equals(relation2)).toBe(true);
    });

    it('復元日時を含む同じデータのRestoreRelationは等しい', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: '2026-01-23T14:00:00Z',
      };
      const relation1 = RestoreRelation.create(data);
      const relation2 = RestoreRelation.create(data);

      expect(relation1.equals(relation2)).toBe(true);
    });

    it('異なるイベントIDのRestoreRelationは等しくない', () => {
      const data1 = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const data2 = {
        eventId: 'event-id-67890',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const relation1 = RestoreRelation.create(data1);
      const relation2 = RestoreRelation.create(data2);

      expect(relation1.equals(relation2)).toBe(false);
    });

    it('復元日時が異なるRestoreRelationは等しくない', () => {
      const data1 = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: '2026-01-23T14:00:00Z',
      };
      const data2 = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: '2026-01-24T15:00:00Z',
      };
      const relation1 = RestoreRelation.create(data1);
      const relation2 = RestoreRelation.create(data2);

      expect(relation1.equals(relation2)).toBe(false);
    });

    it('復元日時があるものとないものは等しくない', () => {
      const data1 = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
        restoredAt: '2026-01-23T14:00:00Z',
      };
      const data2 = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const relation1 = RestoreRelation.create(data1);
      const relation2 = RestoreRelation.create(data2);

      expect(relation1.equals(relation2)).toBe(false);
    });

    it('nullやundefinedと比較するとfalseを返す', () => {
      const data = {
        eventId: 'event-id-12345',
        title: 'プロジェクトAの調査',
        savedAt: '2026-01-22T10:00:00Z',
      };
      const relation = RestoreRelation.create(data);

      expect(relation.equals(null as unknown as RestoreRelation)).toBe(false);
      expect(relation.equals(undefined as unknown as RestoreRelation)).toBe(false);
    });
  });
});
