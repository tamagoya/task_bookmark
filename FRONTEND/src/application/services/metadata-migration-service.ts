import { MetadataMigrator } from '../../domain/factories/metadata-migrator';
import { SchemaVersion } from '../../domain/value-objects/schema-version';
import { WorkState } from '../../domain/entities/work-state';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * MetadataMigrationService
 * メタデータのマイグレーションを担当
 */
export class MetadataMigrationService {
  /**
   * 現在のスキーマバージョン（最新）
   */
  private static readonly CURRENT_VERSION = SchemaVersion.create(1, 0, 0);

  constructor(private readonly logger: Logger) {}

  /**
   * 古いバージョンのWorkStateを最新バージョンにマイグレーション
   * @param workState 仕事状態
   * @returns マイグレーション後の仕事状態
   */
  async migrateToLatestVersion(workState: WorkState): Promise<WorkState> {
    if (!workState.metadata) {
      this.logger.warn('Cannot migrate WorkState without metadata');
      return workState;
    }

    const currentVersion = workState.metadata.version;
    if (currentVersion.equals(MetadataMigrationService.CURRENT_VERSION)) {
      return workState;
    }

    if (!MetadataMigrator.canMigrate(currentVersion, MetadataMigrationService.CURRENT_VERSION)) {
      this.logger.error(
        `Cannot migrate from ${currentVersion.toString()} to ${MetadataMigrationService.CURRENT_VERSION.toString()}`
      );
      return workState;
    }

    try {
      const migratedMetadata = MetadataMigrator.migrate(
        workState.metadata,
        MetadataMigrationService.CURRENT_VERSION
      );

      // メタデータを更新（イミュータビリティのため新しいインスタンスを作成）
      workState.updateMetadata(migratedMetadata);

      this.logger.info(
        `Migrated WorkState from ${currentVersion.toString()} to ${MetadataMigrationService.CURRENT_VERSION.toString()}`
      );

      return workState;
    } catch (error) {
      this.logger.error(
        `Failed to migrate WorkState: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return workState;
    }
  }

  /**
   * 破損データの検証と修復の試み
   * @param workState 仕事状態
   * @returns 検証後の仕事状態
   */
  async validateAndRepair(workState: WorkState): Promise<WorkState> {
    if (!workState.isCorrupted) {
      return workState;
    }

    // 部分的に読み込み可能な場合は、そのまま返す
    if (workState.canPartiallyLoad()) {
      this.logger.warn(
        `WorkState is corrupted but can be partially loaded: ${workState.eventId.value}`
      );
      return workState;
    }

    // 完全に読み込めない場合は、エラーをログに記録
    this.logger.error(
      `WorkState cannot be loaded: ${workState.eventId.value}, errors: ${workState.validationErrors.map((e) => e.errorMessage).join(', ')}`
    );

    return workState;
  }
}
