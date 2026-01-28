import { CalendarId } from '../../../src/domain/value-objects/calendar-id';

describe('CalendarId', () => {
  describe('作成', () => {
    it('有効なカレンダーIDで作成できる', () => {
      const calendarIdValue = 'calendar-id-12345';
      const calendarId = CalendarId.create(calendarIdValue);
      
      expect(calendarId).toBeDefined();
      expect(calendarId.value).toBe(calendarIdValue);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        CalendarId.create('');
      }).toThrow('CalendarId value cannot be empty');
    });
  });

  describe('等価性', () => {
    it('同じ値のカレンダーIDは等しい', () => {
      const id1 = CalendarId.create('calendar-id-12345');
      const id2 = CalendarId.create('calendar-id-12345');
      
      expect(id1.equals(id2)).toBe(true);
    });

    it('異なる値のカレンダーIDは等しくない', () => {
      const id1 = CalendarId.create('calendar-id-12345');
      const id2 = CalendarId.create('calendar-id-67890');
      
      expect(id1.equals(id2)).toBe(false);
    });
  });
});
