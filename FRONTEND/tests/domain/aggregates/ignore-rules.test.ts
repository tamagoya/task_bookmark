import { IgnoreRulesAggregate } from '../../../src/domain/aggregates/ignore-rules';
import { IgnoreRule } from '../../../src/domain/value-objects/ignore-rule';
import { IgnorePattern } from '../../../src/domain/value-objects/ignore-pattern';
import { IgnoreFlags } from '../../../src/domain/value-objects/ignore-flags';

const makeRule = (
  id: string,
  pattern: string,
  flags?: Partial<{
    ignoreOnSave: boolean;
    ignoreOnClose: boolean;
    ignoreOnRestore: boolean;
  }>,
  enabled = true
) => {
  const baseDate = new Date('2026-05-28T00:00:00.000Z');
  return IgnoreRule.create({
    id,
    pattern: IgnorePattern.create(pattern),
    flags: IgnoreFlags.create({
      ignoreOnSave: flags?.ignoreOnSave ?? true,
      ignoreOnClose: flags?.ignoreOnClose ?? true,
      ignoreOnRestore: flags?.ignoreOnRestore ?? true,
    }),
    enabled,
    createdAt: baseDate,
    updatedAt: baseDate,
  });
};

describe('IgnoreRulesAggregate', () => {
  describe('empty / fromRules', () => {
    it('empty は空集約', () => {
      const agg = IgnoreRulesAggregate.empty();
      expect(agg.size()).toBe(0);
      expect(agg.list()).toEqual([]);
    });

    it('fromRules で構築できる', () => {
      const rules = [makeRule('1', 'a'), makeRule('2', 'b')];
      const agg = IgnoreRulesAggregate.fromRules(rules);
      expect(agg.size()).toBe(2);
    });

    it('上限超過はエラー', () => {
      const rules: IgnoreRule[] = [];
      for (let i = 0; i <= IgnoreRulesAggregate.MAX_RULES; i++) {
        rules.push(makeRule(`id-${i}`, `pattern-${i}`));
      }
      expect(() => IgnoreRulesAggregate.fromRules(rules)).toThrow(
        /cannot contain more than/
      );
    });

    it('重複 pattern はエラー', () => {
      const rules = [makeRule('1', 'same'), makeRule('2', 'same')];
      expect(() => IgnoreRulesAggregate.fromRules(rules)).toThrow(
        /duplicate pattern/
      );
    });
  });

  describe('add', () => {
    it('ルールを追加できる', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      expect(agg.size()).toBe(1);
    });

    it('重複 pattern を追加するとエラー', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'same'));
      expect(() => agg.add(makeRule('2', 'same'))).toThrow(
        /already exists/
      );
    });

    it('重複 id を追加するとエラー', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      expect(() => agg.add(makeRule('1', 'b'))).toThrow(
        /id "1" already exists/
      );
    });

    it('上限到達後の追加はエラー', () => {
      let agg = IgnoreRulesAggregate.empty();
      for (let i = 0; i < IgnoreRulesAggregate.MAX_RULES; i++) {
        agg = agg.add(makeRule(`id-${i}`, `p-${i}`));
      }
      expect(() => agg.add(makeRule('extra', 'extra'))).toThrow(
        /limit of 100 rules reached/
      );
    });
  });

  describe('update', () => {
    it('id 指定で更新できる', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      const next = agg.update('1', (r) =>
        r.withPattern(IgnorePattern.create('b'), new Date())
      );
      expect(next.find('1')!.pattern.value).toBe('b');
    });

    it('未知の id はエラー', () => {
      const agg = IgnoreRulesAggregate.empty();
      expect(() => agg.update('x', (r) => r)).toThrow(
        /Ignore rule not found/
      );
    });

    it('id を改変するとエラー', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      expect(() =>
        agg.update('1', () => makeRule('2', 'a'))
      ).toThrow('IgnoreRule id cannot be changed');
    });

    it('pattern を別ルールと重複させるとエラー', () => {
      const agg = IgnoreRulesAggregate.empty()
        .add(makeRule('1', 'a'))
        .add(makeRule('2', 'b'));
      expect(() =>
        agg.update('2', (r) =>
          r.withPattern(IgnorePattern.create('a'), new Date())
        )
      ).toThrow(/already exists/);
    });
  });

  describe('remove / setEnabled', () => {
    it('remove で削除', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      const next = agg.remove('1');
      expect(next.size()).toBe(0);
    });

    it('remove で存在しない id を渡すと変化しない', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      const next = agg.remove('x');
      expect(next).toBe(agg);
    });

    it('setEnabled で切替できる', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a'));
      const next = agg.setEnabled('1', false, new Date());
      expect(next.find('1')!.enabled).toBe(false);
    });

    it('setEnabled で同値ならインスタンスが同じ', () => {
      const agg = IgnoreRulesAggregate.empty().add(makeRule('1', 'a', undefined, true));
      const next = agg.setEnabled('1', true, new Date());
      expect(next).toBe(agg);
    });
  });

  describe('isIgnored* / findIgnored*', () => {
    const aggregate = IgnoreRulesAggregate.empty()
      .add(
        makeRule(
          '1',
          'meet.google.com',
          { ignoreOnSave: true, ignoreOnClose: false, ignoreOnRestore: false }
        )
      )
      .add(
        makeRule(
          '2',
          'portal.example.com',
          { ignoreOnSave: true, ignoreOnClose: true, ignoreOnRestore: true }
        )
      )
      .add(
        makeRule(
          '3',
          'disabled.example.com',
          { ignoreOnSave: true, ignoreOnClose: true, ignoreOnRestore: true },
          false
        )
      );

    it('保存無視: meet 系は除外、ポータルも除外', () => {
      expect(aggregate.isIgnoredOnSave('https://meet.google.com/x')).toBe(true);
      expect(aggregate.isIgnoredOnSave('https://portal.example.com/y')).toBe(true);
    });

    it('閉じる無視: meet は対象外（保存はするが閉じない設定だがフラグは false）', () => {
      expect(aggregate.isIgnoredOnClose('https://meet.google.com/x')).toBe(false);
      expect(aggregate.isIgnoredOnClose('https://portal.example.com/y')).toBe(true);
    });

    it('復元無視: ポータルだけ true', () => {
      expect(aggregate.isIgnoredOnRestore('https://meet.google.com/x')).toBe(false);
      expect(aggregate.isIgnoredOnRestore('https://portal.example.com/y')).toBe(true);
    });

    it('disabled なルールはどの種別でも該当しない', () => {
      expect(aggregate.isIgnoredOnSave('https://disabled.example.com/x')).toBe(false);
      expect(aggregate.isIgnoredOnClose('https://disabled.example.com/x')).toBe(false);
      expect(aggregate.isIgnoredOnRestore('https://disabled.example.com/x')).toBe(false);
    });

    it('一致しないURLはどの種別でも該当しない', () => {
      expect(aggregate.isIgnoredOnSave('https://other.example.com')).toBe(false);
    });

    it('findIgnoredOnSave は最初に一致したルールを返す', () => {
      const rule = aggregate.findIgnoredOnSave('https://portal.example.com/abc');
      expect(rule?.id).toBe('2');
    });
  });
});
