import { WorkStateMetadata } from './work-state-metadata';
import { SchemaVersion } from './schema-version';
import { ValidationError } from './validation-error';

/**
 * EventDescription Value Object
 * イベント説明（JSON形式のメタデータ）を表す不変オブジェクト
 * スキーマバージョニングと拡張性をサポート
 */
export class EventDescription {
  private constructor(private readonly _value: string) {
    // 基本的なJSON形式チェック
    try {
      JSON.parse(_value);
    } catch {
      throw new Error('EventDescription value must be valid JSON');
    }
  }

  /**
   * メタデータからEventDescriptionを作成
   * @param metadata メタデータ
   * @returns EventDescriptionインスタンス
   */
  static create(metadata: WorkStateMetadata): EventDescription {
    const json = metadata.toJSON();
    const jsonString = JSON.stringify(json);
    return new EventDescription(jsonString);
  }

  /**
   * JSON文字列からEventDescriptionを作成
   * @param jsonString JSON文字列
   * @returns EventDescriptionインスタンス
   */
  static fromString(jsonString: string): EventDescription {
    return new EventDescription(jsonString);
  }

  /**
   * JSON文字列からメタデータを解析
   * @param jsonString JSON文字列
   * @returns メタデータ
   */
  static parse(jsonString: string): WorkStateMetadata {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!parsed.version || typeof parsed.version !== 'string') {
      throw new Error('EventDescription must contain a version field');
    }

    const version = SchemaVersion.parse(parsed.version);
    return WorkStateMetadata.createFromRaw(parsed, version);
  }

  /**
   * JSON文字列からメタデータを解析（堅牢性を重視）
   * @param jsonString JSON文字列
   * @returns メタデータ（部分的に読み込めた場合）とエラーリスト
   */
  static tryParse(jsonString: string): {
    metadata: WorkStateMetadata | null;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];

    // ステップ1: JSON形式の検証
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      errors.push(
        ValidationError.create(
          'description',
          'INVALID_JSON',
          'JSON形式が無効です',
          'CRITICAL',
          false
        )
      );
      return { metadata: null, errors };
    }

    // ステップ2: スキーマバージョンの検証
    let version: SchemaVersion;
    try {
      if (!parsed.version || typeof parsed.version !== 'string') {
        errors.push(
          ValidationError.create(
            'description.version',
            'MISSING_FIELD',
            'スキーマバージョンが含まれていません',
            'CRITICAL',
            false
          )
        );
        return { metadata: null, errors };
      }
      version = SchemaVersion.parse(parsed.version);
    } catch (error) {
      errors.push(
        ValidationError.create(
          'description.version',
          'INVALID_SCHEMA_VERSION',
          `スキーマバージョンが無効です: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'CRITICAL',
          false
        )
      );
      return { metadata: null, errors };
    }

    // ステップ3: 必須フィールドの検証
    if (!parsed.tabs || !Array.isArray(parsed.tabs)) {
      errors.push(
        ValidationError.create(
          'description.tabs',
          'MISSING_FIELD',
          'タブ情報が含まれていません',
          'WARNING',
          true
        )
      );
    }

    if (!parsed.savedAt || typeof parsed.savedAt !== 'string') {
      errors.push(
        ValidationError.create(
          'description.savedAt',
          'MISSING_FIELD',
          '保存日時が含まれていません',
          'WARNING',
          true
        )
      );
    }

    // ステップ4: 部分的に読み込み可能な場合はメタデータを作成
    try {
      const metadata = WorkStateMetadata.createFromRaw(parsed, version);
      return { metadata, errors };
    } catch (error) {
      errors.push(
        ValidationError.create(
          'description',
          'PARTIAL_DATA_LOSS',
          `メタデータの一部が失われました: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'WARNING',
          true
        )
      );
      // 部分的にでも読み込める場合は、最小限のメタデータを作成
      return { metadata: null, errors };
    }
  }

  /**
   * JSON文字列を指定されたバージョンにマイグレーション
   * @param jsonString JSON文字列
   * @param targetVersion ターゲットバージョン
   * @returns マイグレーション後のJSON文字列
   */
  static migrate(jsonString: string, targetVersion: SchemaVersion): string {
    const { metadata, errors } = EventDescription.tryParse(jsonString);
    if (!metadata) {
      throw new Error(`Cannot migrate: ${errors.map((e) => e.errorMessage).join(', ')}`);
    }

    const currentVersion = metadata.version;
    if (!currentVersion.canMigrateTo(targetVersion)) {
      throw new Error(
        `Cannot migrate from ${currentVersion.toString()} to ${targetVersion.toString()}`
      );
    }

    // 現在のバージョンと同じ場合はそのまま返す
    if (currentVersion.equals(targetVersion)) {
      return jsonString;
    }

    // マイグレーションロジック（簡易版）
    // 実際のマイグレーションはMetadataMigratorで実装
    const json = metadata.toJSON();
    json.version = targetVersion.toString();
    return JSON.stringify(json);
  }

  /**
   * JSON文字列の値を取得
   */
  get value(): string {
    return this._value;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のEventDescription
   * @returns 等しい場合true
   */
  equals(other: EventDescription): boolean {
    if (!other) {
      return false;
    }
    return this._value === other._value;
  }
}
