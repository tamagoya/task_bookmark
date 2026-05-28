import { IgnoreRuleFactory } from '../../../src/domain/factories/ignore-rule-factory';

describe('IgnoreRuleFactory', () => {
  describe('createNew', () => {
    it('新規ルールを作成（id, タイムスタンプ自動付与）', () => {
      const rule = IgnoreRuleFactory.createNew({
        pattern: 'meet.google.com',
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: false,
      });
      expect(rule.id).toBeTruthy();
      expect(rule.enabled).toBe(true);
      expect(rule.pattern.value).toBe('meet.google.com');
      expect(rule.flags.ignoreOnSave).toBe(true);
      expect(rule.flags.ignoreOnClose).toBe(true);
      expect(rule.flags.ignoreOnRestore).toBe(false);
      expect(rule.createdAt).toBeInstanceOf(Date);
      expect(rule.updatedAt).toBeInstanceOf(Date);
      expect(rule.createdAt.getTime()).toBe(rule.updatedAt.getTime());
    });

    it('label は trim & 空文字なら undefined', () => {
      const rule = IgnoreRuleFactory.createNew({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
        label: '   ',
      });
      expect(rule.label).toBeUndefined();
    });

    it('全フラグ false はエラー（IgnoreFlags経由で発生）', () => {
      expect(() =>
        IgnoreRuleFactory.createNew({
          pattern: 'a',
          ignoreOnSave: false,
          ignoreOnClose: false,
          ignoreOnRestore: false,
        })
      ).toThrow(/at least one flag set to true/);
    });

    it('now を指定した場合はその時刻が createdAt/updatedAt になる', () => {
      const fixed = new Date('2026-05-28T01:23:45.678Z');
      const rule = IgnoreRuleFactory.createNew({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
        now: fixed,
      });
      expect(rule.createdAt.toISOString()).toBe(fixed.toISOString());
      expect(rule.updatedAt.toISOString()).toBe(fixed.toISOString());
    });
  });

  describe('fromPersisted', () => {
    it('永続化形式から復元できる', () => {
      const rule = IgnoreRuleFactory.fromPersisted({
        id: 'abc',
        pattern: 'meet.google.com',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: true,
        label: 'Google Meet',
        enabled: true,
        createdAt: '2026-05-28T00:00:00.000Z',
        updatedAt: '2026-05-28T01:00:00.000Z',
      });
      expect(rule.id).toBe('abc');
      expect(rule.label).toBe('Google Meet');
      expect(rule.flags.ignoreOnSave).toBe(true);
      expect(rule.flags.ignoreOnRestore).toBe(true);
      expect(rule.createdAt.toISOString()).toBe('2026-05-28T00:00:00.000Z');
      expect(rule.updatedAt.toISOString()).toBe('2026-05-28T01:00:00.000Z');
    });

    it('不正な日付文字列はエラー', () => {
      expect(() =>
        IgnoreRuleFactory.fromPersisted({
          id: 'abc',
          pattern: 'a',
          ignoreOnSave: true,
          ignoreOnClose: false,
          ignoreOnRestore: false,
          enabled: true,
          createdAt: 'invalid',
          updatedAt: '2026-05-28T00:00:00.000Z',
        })
      ).toThrow(/createdAt must be a valid Date/);
    });
  });

  describe('generateId', () => {
    it('文字列の id を生成できる（重複しにくい）', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(IgnoreRuleFactory.generateId());
      }
      expect(ids.size).toBe(50);
    });
  });
});
