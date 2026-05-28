import { IgnoreRule } from '../../../src/domain/value-objects/ignore-rule';
import { IgnorePattern } from '../../../src/domain/value-objects/ignore-pattern';
import { IgnoreFlags } from '../../../src/domain/value-objects/ignore-flags';

const buildRule = (overrides?: Partial<{
  id: string;
  pattern: IgnorePattern;
  flags: IgnoreFlags;
  label?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}>) => {
  const baseDate = new Date('2026-05-28T00:00:00.000Z');
  return IgnoreRule.create({
    id: overrides?.id ?? 'rule-1',
    pattern: overrides?.pattern ?? IgnorePattern.create('meet.google.com'),
    flags:
      overrides?.flags ??
      IgnoreFlags.create({
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: true,
      }),
    label: overrides?.label,
    enabled: overrides?.enabled ?? true,
    createdAt: overrides?.createdAt ?? baseDate,
    updatedAt: overrides?.updatedAt ?? baseDate,
  });
};

describe('IgnoreRule', () => {
  describe('create', () => {
    it('正しい入力で作成できる', () => {
      const rule = buildRule();
      expect(rule.id).toBe('rule-1');
      expect(rule.enabled).toBe(true);
      expect(rule.label).toBeUndefined();
    });

    it('空の id はエラー', () => {
      expect(() => buildRule({ id: '' })).toThrow(
        'IgnoreRule id cannot be empty'
      );
    });

    it('label が長すぎる場合はエラー', () => {
      const long = 'a'.repeat(IgnoreRule.MAX_LABEL_LENGTH + 1);
      expect(() => buildRule({ label: long })).toThrow(/at most 100/);
    });

    it('label の前後空白はトリムされ、空文字なら undefined になる', () => {
      const r1 = buildRule({ label: '   my label   ' });
      expect(r1.label).toBe('my label');
      const r2 = buildRule({ label: '   ' });
      expect(r2.label).toBeUndefined();
    });

    it('createdAt が無効な日付ならエラー', () => {
      expect(() =>
        buildRule({ createdAt: new Date('invalid') })
      ).toThrow('IgnoreRule createdAt must be a valid Date');
    });
  });

  describe('matches / appliesOn*', () => {
    const url = 'https://meet.google.com/abc';

    it('enabled = false ならどのフラグでも適用されない', () => {
      const rule = buildRule({ enabled: false });
      expect(rule.matches(url)).toBe(false);
      expect(rule.appliesOnSave(url)).toBe(false);
      expect(rule.appliesOnClose(url)).toBe(false);
      expect(rule.appliesOnRestore(url)).toBe(false);
    });

    it('該当するフラグだけ true を返す', () => {
      const rule = buildRule({
        flags: IgnoreFlags.create({
          ignoreOnSave: false,
          ignoreOnClose: true,
          ignoreOnRestore: false,
        }),
      });
      expect(rule.appliesOnSave(url)).toBe(false);
      expect(rule.appliesOnClose(url)).toBe(true);
      expect(rule.appliesOnRestore(url)).toBe(false);
    });

    it('該当しないURLには false', () => {
      const rule = buildRule();
      expect(rule.matches('https://example.com')).toBe(false);
    });
  });

  describe('with* メソッド', () => {
    it('withPattern で新パターンに変更（updatedAtが進む）', () => {
      const rule = buildRule();
      const next = rule.withPattern(
        IgnorePattern.create('portal.example.com'),
        new Date('2026-06-01T00:00:00Z')
      );
      expect(next.pattern.value).toBe('portal.example.com');
      expect(next.updatedAt.toISOString()).toBe('2026-06-01T00:00:00.000Z');
      expect(next.id).toBe(rule.id);
    });

    it('withFlags でフラグ変更', () => {
      const rule = buildRule();
      const next = rule.withFlags(
        IgnoreFlags.create({
          ignoreOnSave: false,
          ignoreOnClose: true,
          ignoreOnRestore: false,
        }),
        new Date()
      );
      expect(next.flags.ignoreOnSave).toBe(false);
      expect(next.flags.ignoreOnClose).toBe(true);
    });

    it('withLabel(undefined) でラベルクリアできる', () => {
      const rule = buildRule({ label: 'before' });
      const next = rule.withLabel(undefined, new Date());
      expect(next.label).toBeUndefined();
    });

    it('withLabel が長過ぎる場合はエラー', () => {
      const rule = buildRule();
      const long = 'a'.repeat(IgnoreRule.MAX_LABEL_LENGTH + 1);
      expect(() => rule.withLabel(long, new Date())).toThrow(/at most 100/);
    });

    it('withEnabled(false) で無効化', () => {
      const rule = buildRule();
      const next = rule.withEnabled(false, new Date());
      expect(next.enabled).toBe(false);
    });
  });

  describe('equals', () => {
    it('完全に同一なら等しい', () => {
      const a = buildRule();
      const b = buildRule();
      expect(a.equals(b)).toBe(true);
    });

    it('id が異なれば等しくない', () => {
      const a = buildRule();
      const b = buildRule({ id: 'rule-2' });
      expect(a.equals(b)).toBe(false);
    });

    it('null/undefined とは等しくない', () => {
      const a = buildRule();
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
    });
  });
});
