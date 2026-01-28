import { WorkStateMetadata } from '../value-objects/work-state-metadata';
import { SchemaVersion } from '../value-objects/schema-version';

/**
 * MetadataMigrator
 * メタデータのマイグレーションを担当するFactory
 * 古いバージョンのデータを新しいバージョンに変換
 */
export class MetadataMigrator {
  /**
   * メタデータを指定されたバージョンにマイグレーション
   * @param metadata メタデータ
   * @param targetVersion ターゲットバージョン
   * @returns マイグレーション後のメタデータ
   */
  static migrate(metadata: WorkStateMetadata, targetVersion: SchemaVersion): WorkStateMetadata {
    const currentVersion = metadata.version;

    if (currentVersion.equals(targetVersion)) {
      return metadata;
    }

    if (!currentVersion.canMigrateTo(targetVersion)) {
      throw new Error(
        `Cannot migrate from ${currentVersion.toString()} to ${targetVersion.toString()}`
      );
    }

    // マイグレーション戦略の適用
    const migrationPath = MetadataMigrator.getMigrationPath(currentVersion, targetVersion);
    let migratedMetadata = metadata;

    for (const intermediateVersion of migrationPath) {
      migratedMetadata = MetadataMigrator.applyMigration(migratedMetadata, intermediateVersion);
    }

    return migratedMetadata;
  }

  /**
   * 指定されたバージョン間でマイグレーション可能かどうかを判定
   * @param fromVersion 元のバージョン
   * @param toVersion ターゲットバージョン
   * @returns マイグレーション可能な場合true
   */
  static canMigrate(fromVersion: SchemaVersion, toVersion: SchemaVersion): boolean {
    return fromVersion.canMigrateTo(toVersion);
  }

  /**
   * マイグレーションパス（中間バージョンのリスト）を取得
   * @param fromVersion 元のバージョン
   * @param toVersion ターゲットバージョン
   * @returns マイグレーションに必要な中間バージョンのリスト
   */
  static getMigrationPath(fromVersion: SchemaVersion, toVersion: SchemaVersion): SchemaVersion[] {
    const path: SchemaVersion[] = [];

    // 同じメジャーバージョンの場合
    if (fromVersion.major === toVersion.major) {
      // マイナーバージョンとパッチバージョンを段階的に更新
      let current = fromVersion;
      while (!current.equals(toVersion)) {
        if (current.minor < toVersion.minor) {
          current = SchemaVersion.create(current.major, current.minor + 1, 0);
        } else if (current.patch < toVersion.patch) {
          current = SchemaVersion.create(current.major, current.minor, current.patch + 1);
        } else {
          break;
        }
        path.push(current);
      }
    } else if (fromVersion.major < toVersion.major) {
      // メジャーバージョンアップの場合
      // 現在の実装では、メジャーバージョンアップは直接サポート
      // 将来的に中間バージョンを経由する必要がある場合は、ここに追加
      path.push(toVersion);
    }

    return path;
  }

  /**
   * マイグレーション戦略を適用
   * @param metadata メタデータ
   * @param targetVersion ターゲットバージョン
   * @returns マイグレーション後のメタデータ
   */
  private static applyMigration(
    metadata: WorkStateMetadata,
    targetVersion: SchemaVersion
  ): WorkStateMetadata {
    const currentVersion = metadata.version;

    // 現在のバージョンと同じ場合はそのまま返す
    if (currentVersion.equals(targetVersion)) {
      return metadata;
    }

    // マイグレーション戦略の適用
    // 現在の実装では、後方互換性のある変更（マイナーバージョンアップ）のみをサポート
    // メジャーバージョンアップの場合は、将来的に実装

    // 後方互換性を保つため、既存のフィールドは保持される
    // 新しいフィールドはextensionsに保持される（前方互換性のため）
    const json = metadata.toJSON();
    json.version = targetVersion.toString();

    return WorkStateMetadata.createFromRaw(json, targetVersion);
  }
}
