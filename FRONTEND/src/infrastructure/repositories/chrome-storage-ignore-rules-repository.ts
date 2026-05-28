import { IgnoreRulesRepository } from '../../domain/repositories/ignore-rules-repository';
import { IgnoreRulesAggregate } from '../../domain/aggregates/ignore-rules';
import { IgnoreRule } from '../../domain/value-objects/ignore-rule';
import { IgnoreRuleFactory } from '../../domain/factories/ignore-rule-factory';
import { Logger } from '../adapters/logger';

/**
 * 永続化フォーマット（chrome.storage.local 上の構造）
 */
interface PersistedIgnoreRule {
  id: string;
  pattern: string;
  ignoreOnSave: boolean;
  ignoreOnClose: boolean;
  ignoreOnRestore: boolean;
  label?: string;
  enabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface PersistedIgnoreRules {
  schemaVersion: number;
  rules: PersistedIgnoreRule[];
}

/**
 * ChromeStorageIgnoreRulesRepository
 * IgnoreRulesRepository の chrome.storage.local 実装
 *
 * - キー: "ignoreRules"
 * - フォーマット: { schemaVersion: 1, rules: [...] }
 * - 不正データを検出した場合は破損と判定し、空集約を返してログのみ出力（UIには通知しない）
 */
export class ChromeStorageIgnoreRulesRepository implements IgnoreRulesRepository {
  private readonly STORAGE_KEY = 'ignoreRules';

  constructor(private readonly logger: Logger = new Logger()) {}

  async load(): Promise<IgnoreRulesAggregate> {
    const stored = await this.getStored();
    if (!stored) {
      return IgnoreRulesAggregate.empty();
    }

    try {
      const rules: IgnoreRule[] = stored.rules.map((p) =>
        IgnoreRuleFactory.fromPersisted({
          id: p.id,
          pattern: p.pattern,
          ignoreOnSave: p.ignoreOnSave,
          ignoreOnClose: p.ignoreOnClose,
          ignoreOnRestore: p.ignoreOnRestore,
          label: p.label,
          enabled: p.enabled,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })
      );
      return IgnoreRulesAggregate.fromRules(rules);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Stored ignore rules are corrupted, returning empty aggregate: ${message}`
      );
      return IgnoreRulesAggregate.empty();
    }
  }

  async save(aggregate: IgnoreRulesAggregate): Promise<void> {
    const persisted: PersistedIgnoreRules = {
      schemaVersion: IgnoreRulesAggregate.SCHEMA_VERSION,
      rules: aggregate.list().map((rule) => this.serialize(rule)),
    };
    await this.setStored(persisted);
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(this.STORAGE_KEY, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  private serialize(rule: IgnoreRule): PersistedIgnoreRule {
    const persisted: PersistedIgnoreRule = {
      id: rule.id,
      pattern: rule.pattern.value,
      ignoreOnSave: rule.flags.ignoreOnSave,
      ignoreOnClose: rule.flags.ignoreOnClose,
      ignoreOnRestore: rule.flags.ignoreOnRestore,
      enabled: rule.enabled,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    };
    if (rule.label !== undefined) {
      persisted.label = rule.label;
    }
    return persisted;
  }

  private async getStored(): Promise<PersistedIgnoreRules | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        const raw = result[this.STORAGE_KEY] as unknown;
        if (!raw) {
          resolve(null);
          return;
        }
        if (!this.isPersistedShape(raw)) {
          this.logger.warn('Stored ignore rules have invalid shape, ignoring');
          resolve(null);
          return;
        }
        resolve(raw);
      });
    });
  }

  private async setStored(value: PersistedIgnoreRules): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: value }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  private isPersistedShape(value: unknown): value is PersistedIgnoreRules {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as { schemaVersion?: unknown; rules?: unknown };
    if (typeof v.schemaVersion !== 'number') {
      return false;
    }
    if (!Array.isArray(v.rules)) {
      return false;
    }
    return v.rules.every((r) => this.isPersistedRuleShape(r));
  }

  private isPersistedRuleShape(value: unknown): value is PersistedIgnoreRule {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const v = value as Record<string, unknown>;
    return (
      typeof v.id === 'string' &&
      typeof v.pattern === 'string' &&
      typeof v.ignoreOnSave === 'boolean' &&
      typeof v.ignoreOnClose === 'boolean' &&
      typeof v.ignoreOnRestore === 'boolean' &&
      typeof v.enabled === 'boolean' &&
      typeof v.createdAt === 'string' &&
      typeof v.updatedAt === 'string' &&
      (v.label === undefined || typeof v.label === 'string')
    );
  }
}
