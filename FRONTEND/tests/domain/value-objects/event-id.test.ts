import { EventId } from '../../../src/domain/value-objects/event-id';

describe('EventId', () => {
  describe('作成', () => {
    it('有効なイベントID値で作成できる', () => {
      const eventIdValue = 'event-id-12345';
      const eventId = EventId.create(eventIdValue);
      
      expect(eventId).toBeDefined();
      expect(eventId.value).toBe(eventIdValue);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        EventId.create('');
      }).toThrow('EventId value cannot be empty');
    });
  });

  describe('等価性', () => {
    it('同じ値のイベントIDは等しい', () => {
      const eventId1 = EventId.create('event-id-12345');
      const eventId2 = EventId.create('event-id-12345');
      
      expect(eventId1.equals(eventId2)).toBe(true);
    });

    it('異なる値のイベントIDは等しくない', () => {
      const eventId1 = EventId.create('event-id-12345');
      const eventId2 = EventId.create('event-id-67890');
      
      expect(eventId1.equals(eventId2)).toBe(false);
    });
  });
});
