import { EventTitle } from '../../../src/domain/value-objects/event-title';

describe('EventTitle', () => {
  describe('作成', () => {
    it('有効なタイトル値で作成できる', () => {
      const titleValue = '仕事名';
      const title = EventTitle.create(titleValue);
      
      expect(title).toBeDefined();
      expect(title.value).toBe(titleValue);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        EventTitle.create('');
      }).toThrow('EventTitle value cannot be empty');
    });

    it('最大長を超えるタイトルで作成しようとするとエラーを投げる', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => {
        EventTitle.create(longTitle);
      }).toThrow('EventTitle value must be at most 200 characters');
    });
  });

  describe('等価性', () => {
    it('同じ値のタイトルは等しい', () => {
      const title1 = EventTitle.create('仕事名');
      const title2 = EventTitle.create('仕事名');
      
      expect(title1.equals(title2)).toBe(true);
    });

    it('異なる値のタイトルは等しくない', () => {
      const title1 = EventTitle.create('仕事名1');
      const title2 = EventTitle.create('仕事名2');
      
      expect(title1.equals(title2)).toBe(false);
    });
  });
});
