import { IgnoreRulesService } from '../../../src/application/services/ignore-rules-service';
import { IgnoreRulesAggregate } from '../../../src/domain/aggregates/ignore-rules';
import { IgnoreRulesRepository } from '../../../src/domain/repositories/ignore-rules-repository';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';
import { Logger } from '../../../src/infrastructure/adapters/logger';

class InMemoryRepository implements IgnoreRulesRepository {
  current: IgnoreRulesAggregate = IgnoreRulesAggregate.empty();
  loadCalls = 0;
  saveCalls = 0;

  async load(): Promise<IgnoreRulesAggregate> {
    this.loadCalls++;
    return this.current;
  }

  async save(aggregate: IgnoreRulesAggregate): Promise<void> {
    this.saveCalls++;
    this.current = aggregate;
  }

  async clear(): Promise<void> {
    this.current = IgnoreRulesAggregate.empty();
  }
}

const buildLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
  }) as unknown as Logger;

const tab = (url: string, index: number) =>
  TabInfo.create({ url, title: `t-${index}`, index });

describe('IgnoreRulesService', () => {
  let repo: InMemoryRepository;
  let service: IgnoreRulesService;

  beforeEach(() => {
    repo = new InMemoryRepository();
    service = new IgnoreRulesService(repo, buildLogger());
  });

  describe('CRUD', () => {
    it('addRule で1件追加できる', async () => {
      const rule = await service.addRule({
        pattern: 'meet.google.com',
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: false,
      });
      const list = await service.listRules();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe(rule.id);
    });

    it('addRule は重複 pattern を拒否', async () => {
      await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      await expect(
        service.addRule({
          pattern: 'a',
          ignoreOnSave: true,
          ignoreOnClose: false,
          ignoreOnRestore: false,
        })
      ).rejects.toThrow(/already exists/);
    });

    it('updateRule でフラグだけ更新できる', async () => {
      const rule = await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      const updated = await service.updateRule(rule.id, {
        ignoreOnClose: true,
      });
      expect(updated.flags.ignoreOnSave).toBe(true);
      expect(updated.flags.ignoreOnClose).toBe(true);
      expect(updated.flags.ignoreOnRestore).toBe(false);
    });

    it('updateRule で pattern だけ更新できる', async () => {
      const rule = await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      const updated = await service.updateRule(rule.id, { pattern: 'b' });
      expect(updated.pattern.value).toBe('b');
    });

    it('removeRule で削除できる', async () => {
      const rule = await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      await service.removeRule(rule.id);
      expect((await service.listRules()).length).toBe(0);
    });

    it('setEnabled で有効/無効を切替できる', async () => {
      const rule = await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      const off = await service.setEnabled(rule.id, false);
      expect(off.enabled).toBe(false);
      const on = await service.setEnabled(rule.id, true);
      expect(on.enabled).toBe(true);
    });
  });

  describe('filterTabsForSave', () => {
    it('保存無視ルールに該当するタブを除外する', async () => {
      await service.addRule({
        pattern: 'meet.google.com',
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: false,
      });
      const result = await service.filterTabsForSave([
        tab('https://meet.google.com/abc', 0),
        tab('https://example.com/work', 1),
      ]);
      expect(result.map((t) => t.url)).toEqual(['https://example.com/work']);
    });

    it('ルールが無い場合は元配列をコピーして返す', async () => {
      const tabs = [tab('https://example.com', 0)];
      const result = await service.filterTabsForSave(tabs);
      expect(result).toEqual(tabs);
      expect(result).not.toBe(tabs);
    });

    it('空配列なら空配列', async () => {
      expect(await service.filterTabsForSave([])).toEqual([]);
    });

    it('ignoreOnSave=false のルールは保存対象を除外しない', async () => {
      await service.addRule({
        pattern: 'meet.google.com',
        ignoreOnSave: false,
        ignoreOnClose: true,
        ignoreOnRestore: false,
      });
      const result = await service.filterTabsForSave([
        tab('https://meet.google.com/x', 0),
      ]);
      expect(result.length).toBe(1);
    });
  });

  describe('filterTabIdsForClose', () => {
    it('閉じる無視ルールに該当するタブIDを除外する', async () => {
      await service.addRule({
        pattern: 'meet.google.com',
        ignoreOnSave: false,
        ignoreOnClose: true,
        ignoreOnRestore: false,
      });
      const ids = await service.filterTabIdsForClose([
        { tabId: 1, url: 'https://meet.google.com/abc' },
        { tabId: 2, url: 'https://example.com' },
      ]);
      expect(ids).toEqual([2]);
    });

    it('ルール無しなら全ID返す', async () => {
      const ids = await service.filterTabIdsForClose([
        { tabId: 10, url: 'https://example.com' },
      ]);
      expect(ids).toEqual([10]);
    });
  });

  describe('filterTabsForRestore', () => {
    it('復元無視ルールに該当するタブを除外する', async () => {
      await service.addRule({
        pattern: 'portal.example.com',
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: true,
      });
      const result = await service.filterTabsForRestore([
        tab('https://portal.example.com/dashboard', 0),
        tab('https://example.com/article', 1),
      ]);
      expect(result.map((t) => t.url)).toEqual(['https://example.com/article']);
    });
  });

  describe('cache', () => {
    it('複数回 listRules を呼んでも repository.load は最初の1回のみ', async () => {
      await service.listRules();
      await service.listRules();
      await service.listRules();
      expect(repo.loadCalls).toBe(1);
    });

    it('addRule 後はキャッシュが更新され、追加 load は走らない', async () => {
      await service.listRules();
      await service.addRule({
        pattern: 'a',
        ignoreOnSave: true,
        ignoreOnClose: false,
        ignoreOnRestore: false,
      });
      const initialLoads = repo.loadCalls;
      const list = await service.listRules();
      expect(list.length).toBe(1);
      expect(repo.loadCalls).toBe(initialLoads);
    });

    it('invalidateCache で再読み込みされる', async () => {
      await service.listRules();
      service.invalidateCache();
      await service.listRules();
      expect(repo.loadCalls).toBe(2);
    });
  });
});
