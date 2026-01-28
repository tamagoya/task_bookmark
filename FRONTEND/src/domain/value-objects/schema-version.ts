/**
 * SchemaVersion Value Object
 * スキーマバージョンを表す不変オブジェクト
 * セマンティックバージョニング（Semantic Versioning）に準拠
 */
export class SchemaVersion {
  private constructor(
    private readonly _major: number,
    private readonly _minor: number,
    private readonly _patch: number
  ) {
    if (_major < 0 || !Number.isInteger(_major)) {
      throw new Error('SchemaVersion major must be a non-negative integer');
    }
    if (_minor < 0 || !Number.isInteger(_minor)) {
      throw new Error('SchemaVersion minor must be a non-negative integer');
    }
    if (_patch < 0 || !Number.isInteger(_patch)) {
      throw new Error('SchemaVersion patch must be a non-negative integer');
    }
  }

  /**
   * SchemaVersionを作成
   * @param major メジャーバージョン
   * @param minor マイナーバージョン
   * @param patch パッチバージョン
   * @returns SchemaVersionインスタンス
   */
  static create(major: number, minor: number, patch: number): SchemaVersion {
    return new SchemaVersion(major, minor, patch);
  }

  /**
   * バージョン文字列からSchemaVersionを作成
   * @param versionString バージョン文字列（例: "1.0.0"）
   * @returns SchemaVersionインスタンス
   */
  static parse(versionString: string): SchemaVersion {
    if (!versionString || versionString.trim().length === 0) {
      throw new Error('SchemaVersion string cannot be empty');
    }

    const parts = versionString.split('.');
    if (parts.length !== 3) {
      throw new Error(`SchemaVersion string must be in format "major.minor.patch", got: ${versionString}`);
    }

    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const patch = parseInt(parts[2], 10);

    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new Error(`SchemaVersion string must contain only numbers, got: ${versionString}`);
    }

    return new SchemaVersion(major, minor, patch);
  }

  /**
   * メジャーバージョンを取得
   */
  get major(): number {
    return this._major;
  }

  /**
   * マイナーバージョンを取得
   */
  get minor(): number {
    return this._minor;
  }

  /**
   * パッチバージョンを取得
   */
  get patch(): number {
    return this._patch;
  }

  /**
   * バージョン文字列に変換
   * @returns バージョン文字列（例: "1.0.0"）
   */
  toString(): string {
    return `${this._major}.${this._minor}.${this._patch}`;
  }

  /**
   * 他のバージョンと互換性があるかどうかを判定
   * @param other 比較対象のSchemaVersion
   * @returns 同じメジャーバージョンの場合true
   */
  isCompatibleWith(other: SchemaVersion): boolean {
    if (!other) {
      return false;
    }
    return this._major === other._major;
  }

  /**
   * 指定されたバージョンにマイグレーション可能かどうかを判定
   * @param target ターゲットバージョン
   * @returns マイグレーション可能な場合true
   */
  canMigrateTo(target: SchemaVersion): boolean {
    if (!target) {
      return false;
    }
    // 同じメジャーバージョン、または新しいメジャーバージョンがマイグレーションをサポートしている場合
    return this._major === target._major || target._major > this._major;
  }

  /**
   * 等価性チェック
   * @param other 比較対象のSchemaVersion
   * @returns 等しい場合true
   */
  equals(other: SchemaVersion): boolean {
    if (!other) {
      return false;
    }
    return this._major === other._major && this._minor === other._minor && this._patch === other._patch;
  }
}
