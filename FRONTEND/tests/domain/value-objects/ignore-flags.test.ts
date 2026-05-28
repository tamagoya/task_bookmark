import { IgnoreFlags } from '../../../src/domain/value-objects/ignore-flags';

describe('IgnoreFlags', () => {
  describe('create', () => {
    it('1つだけ true で作成できる', () => {
      const f = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      expect(f.ignoreOnSave).toBe(true);
      expect(f.ignoreOnClose).toBe(false);
      expect(f.ignoreOnRestore).toBe(false);
    });

    it('全て true で作成できる', () => {
      const f = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: true,
      });
      expect(f.hasAnyFlag()).toBe(true);
    });

    it('全て false はエラー', () => {
      expect(() =>
        IgnoreFlags.create({
          ignoreOnSave: false,
          ignoreOnClose: false,
          ignoreOnRestore: false,
        })
      ).toThrow('IgnoreFlags must have at least one flag set to true');
    });

    it('boolean以外はエラー', () => {
      expect(() =>
        IgnoreFlags.create({
          // @ts-expect-error 型チェック検証のため意図的に違反
          ignoreOnSave: 'yes',
          ignoreOnClose: false,
          ignoreOnRestore: true,
        })
      ).toThrow('IgnoreFlags fields must all be boolean');
    });
  });

  describe('equals', () => {
    it('同一構成は等しい', () => {
      const a = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: true,
      });
      const b = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: true,
      });
      expect(a.equals(b)).toBe(true);
    });

    it('異なる構成は等しくない', () => {
      const a = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: true,
      });
      const b = IgnoreFlags.create({
        ignoreOnSave: false,
        ignoreOnClose: false,
        ignoreOnRestore: true,
      });
      expect(a.equals(b)).toBe(false);
    });

    it('null/undefined とは等しくない', () => {
      const a = IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
    });
  });
});
