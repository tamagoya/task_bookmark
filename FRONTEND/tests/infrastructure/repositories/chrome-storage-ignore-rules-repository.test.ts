import { ChromeStorageIgnoreRulesRepository } from '../../../src/infrastructure/repositories/chrome-storage-ignore-rules-repository';
import { IgnoreRulesAggregate } from '../../../src/domain/aggregates/ignore-rules';
import { IgnoreRuleFactory } from '../../../src/domain/factories/ignore-rule-factory';
import { Logger } from '../../../src/infrastructure/adapters/logger';

const mockStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
};

const mockChromeRuntime = {
  lastError: undefined as chrome.runtime.LastError | undefined,
};

// @ts-expect-error - Chrome APIのモック
global.chrome = {
  storage: mockStorage,
  runtime: mockChromeRuntime,
} as typeof chrome;

const buildLogger = () =>
  ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    performance: jest.fn(),
  }) as unknown as Logger;

describe('ChromeStorageIgnoreRulesRepository', () => {
  let logger: Logger;
  let repo: ChromeStorageIgnoreRulesRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChromeRuntime.lastError = undefined;
    logger = buildLogger();
    repo = new ChromeStorageIgnoreRulesRepository(logger);
  });

  describe('load', () => {
    it('保存データが無い場合は空集約を返す', async () => {
      mockStorage.local.get.mockImplementation((_key, cb) => cb({}));
      const result = await repo.load();
      expect(result.size()).toBe(0);
    });

    it('保存済みデータから集約を復元できる', async () => {
      mockStorage.local.get.mockImplementation((_key, cb) =>
        cb({
          ignoreRules: {
            schemaVersion: 1,
            rules: [
              {
                id: 'r1',
                pattern: 'meet.google.com',
                ignoreOnSave: true,
                ignoreOnClose: true,
                ignoreOnRestore: false,
                enabled: true,
                createdAt: '2026-05-28T00:00:00.000Z',
                updatedAt: '2026-05-28T00:00:00.000Z',
              },
            ],
          },
        })
      );
      const agg = await repo.load();
      expect(agg.size()).toBe(1);
      expect(agg.find('r1')!.pattern.value).toBe('meet.google.com');
    });

    it('破損データは空集約として扱い警告を出す', async () => {
      mockStorage.local.get.mockImplementation((_key, cb) =>
        cb({
          ignoreRules: {
            schemaVersion: 1,
            rules: [
              {
                id: 'r1',
                pattern: 'a',
                ignoreOnSave: false,
                ignoreOnClose: false,
                ignoreOnRestore: false, // 全 false → IgnoreFlags 例外
                enabled: true,
                createdAt: '2026-05-28T00:00:00.000Z',
                updatedAt: '2026-05-28T00:00:00.000Z',
              },
            ],
          },
        })
      );
      const agg = await repo.load();
      expect(agg.size()).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('スキーマ形状が違う場合も空集約として扱う', async () => {
      mockStorage.local.get.mockImplementation((_key, cb) =>
        cb({ ignoreRules: { rules: 'not-an-array' } })
      );
      const agg = await repo.load();
      expect(agg.size()).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('chrome.runtime.lastError があれば reject', async () => {
      mockStorage.local.get.mockImplementation((_key, cb) => {
        mockChromeRuntime.lastError = { message: 'storage error' };
        cb({});
      });
      await expect(repo.load()).rejects.toThrow('storage error');
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('save', () => {
    it('集約を保存できる', async () => {
      mockStorage.local.set.mockImplementation((_data, cb) => cb());
      const rule = IgnoreRuleFactory.createNew({
        pattern: 'meet.google.com',
        ignoreOnSave: true,
        ignoreOnClose: true,
        ignoreOnRestore: false,
        label: 'Meet',
      });
      const agg = IgnoreRulesAggregate.empty().add(rule);
      await repo.save(agg);
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          ignoreRules: expect.objectContaining({
            schemaVersion: 1,
            rules: expect.any(Array),
          }),
        }),
        expect.any(Function)
      );
    });

    it('保存エラー時は例外', async () => {
      mockStorage.local.set.mockImplementation((_data, cb) => {
        mockChromeRuntime.lastError = { message: 'quota' };
        cb();
      });
      await expect(repo.save(IgnoreRulesAggregate.empty())).rejects.toThrow(
        'quota'
      );
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('clear', () => {
    it('storage から削除する', async () => {
      mockStorage.local.remove.mockImplementation((_key, cb) => cb());
      await repo.clear();
      expect(mockStorage.local.remove).toHaveBeenCalledWith(
        'ignoreRules',
        expect.any(Function)
      );
    });

    it('削除エラー時は例外', async () => {
      mockStorage.local.remove.mockImplementation((_key, cb) => {
        mockChromeRuntime.lastError = { message: 'fail' };
        cb();
      });
      await expect(repo.clear()).rejects.toThrow('fail');
      mockChromeRuntime.lastError = undefined;
    });
  });
});
