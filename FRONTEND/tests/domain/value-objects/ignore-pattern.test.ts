import { IgnorePattern } from '../../../src/domain/value-objects/ignore-pattern';

describe('IgnorePattern', () => {
  describe('create', () => {
    it('有効な文字列で作成できる', () => {
      const p = IgnorePattern.create('meet.google.com');
      expect(p.value).toBe('meet.google.com');
    });

    it('前後の空白はトリムされる', () => {
      const p = IgnorePattern.create('   meet.google.com   ');
      expect(p.value).toBe('meet.google.com');
    });

    it('空文字列はエラー', () => {
      expect(() => IgnorePattern.create('')).toThrow(
        'IgnorePattern value cannot be empty'
      );
    });

    it('空白のみはエラー', () => {
      expect(() => IgnorePattern.create('   ')).toThrow(
        'IgnorePattern value cannot be empty'
      );
    });

    it('文字列以外はエラー', () => {
      // @ts-expect-error 型チェック検証のため意図的に違反
      expect(() => IgnorePattern.create(123)).toThrow(
        'IgnorePattern value must be a string'
      );
    });

    it('最大長を超える場合はエラー', () => {
      const long = 'a'.repeat(IgnorePattern.MAX_LENGTH + 1);
      expect(() => IgnorePattern.create(long)).toThrow(
        /at most 2048 characters/
      );
    });
  });

  describe('matches', () => {
    const p = IgnorePattern.create('meet.google.com');

    it('部分一致するURLにマッチする', () => {
      expect(p.matches('https://meet.google.com/abc-defg-hij')).toBe(true);
    });

    it('クエリパラメータを含むURLにもマッチする', () => {
      expect(p.matches('https://meet.google.com/?foo=bar')).toBe(true);
    });

    it('一致しないURLにはマッチしない', () => {
      expect(p.matches('https://example.com')).toBe(false);
    });

    it('空文字列にはマッチしない', () => {
      expect(p.matches('')).toBe(false);
    });

    it('文字列以外にはマッチしない', () => {
      // @ts-expect-error 型チェック検証のため意図的に違反
      expect(p.matches(undefined)).toBe(false);
    });
  });

  describe('equals', () => {
    it('同じ値同士は等しい', () => {
      const a = IgnorePattern.create('a');
      const b = IgnorePattern.create('a');
      expect(a.equals(b)).toBe(true);
    });

    it('異なる値は等しくない', () => {
      const a = IgnorePattern.create('a');
      const b = IgnorePattern.create('b');
      expect(a.equals(b)).toBe(false);
    });

    it('null/undefined とは等しくない', () => {
      const a = IgnorePattern.create('a');
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
    });
  });
});
