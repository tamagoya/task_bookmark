import { WorkState } from '../entities/work-state';
import { EventId } from '../value-objects/event-id';
import { EventTitle } from '../value-objects/event-title';
import { EventDescription } from '../value-objects/event-description';
import { WorkStateMetadata } from '../value-objects/work-state-metadata';
import { SchemaVersion } from '../value-objects/schema-version';
import { ValidationError } from '../value-objects/validation-error';
import { TabInfo } from '../value-objects/tab-info';
import { MetadataMigrator } from './metadata-migrator';

/**
 * WorkStateFactory
 * WorkStateの作成を担当するFactory
 * スキーマバージョニングとマイグレーションをサポート
 */
export class WorkStateFactory {
  /**
   * 現在のスキーマバージョン（最新）
   */
  private static readonly CURRENT_VERSION = SchemaVersion.create(1, 0, 0);

  /**
   * タブ情報からWorkStateを作成
   * @param eventId イベントID
   * @param title タイトル
   * @param tabs タブ情報の配列
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param memo メモ（任意）
   * @returns WorkStateインスタンス
   */
  static createFromTabs(
    eventId: EventId,
    title: EventTitle,
    tabs: TabInfo[],
    startTime: Date,
    endTime: Date,
    memo?: string
  ): WorkState {
    if (!tabs || tabs.length === 0) {
      throw new Error('WorkState tabs must contain at least one tab');
    }
    if (startTime >= endTime) {
      throw new Error('WorkState startTime must be before endTime');
    }

    const metadata = WorkStateMetadata.create(
      WorkStateFactory.CURRENT_VERSION,
      tabs,
      new Date(),
      memo
    );
    const description = EventDescription.create(metadata);

    return WorkState.create(eventId, title, description, startTime, endTime, metadata);
  }

  /**
   * カレンダーイベントからWorkStateを作成（読み込み時）
   * @param eventId イベントID
   * @param title タイトル
   * @param description 説明（JSON文字列）
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @returns WorkStateインスタンス
   */
  static createFromCalendarEvent(
    eventId: EventId,
    title: string,
    description: string,
    startTime: Date,
    endTime: Date
  ): WorkState {
    const eventTitle = EventTitle.create(title);

    // 堅牢性を重視した解析
    const { metadata, errors } = EventDescription.tryParse(description);

    if (errors.length > 0 && !metadata) {
      // 完全に読み込めない場合は、破損イベントとして作成
      return WorkStateFactory.createFromCorruptedEvent(
        eventId,
        title,
        description,
        startTime,
        endTime,
        errors
      );
    }

    if (metadata) {
      // マイグレーションが必要な場合
      const currentVersion = metadata.version;
      if (!currentVersion.equals(WorkStateFactory.CURRENT_VERSION)) {
        if (currentVersion.canMigrateTo(WorkStateFactory.CURRENT_VERSION)) {
          const migratedMetadata = MetadataMigrator.migrate(
            metadata,
            WorkStateFactory.CURRENT_VERSION
          );
          const migratedDescription = EventDescription.create(migratedMetadata);
          return WorkState.create(eventId, eventTitle, migratedDescription, startTime, endTime, migratedMetadata);
        }
      }

      const eventDescription = EventDescription.create(metadata);
      return WorkState.create(eventId, eventTitle, eventDescription, startTime, endTime, metadata);
    }

    // メタデータがnullの場合（部分的に読み込めない場合）
    const eventDescription = description ? EventDescription.fromString(description) : null;
    const workState = WorkState.create(eventId, eventTitle, eventDescription, startTime, endTime, null);
    if (errors.length > 0) {
      workState.markAsCorrupted(errors);
    }
    return workState;
  }

  /**
   * カレンダーイベントからWorkStateを作成（明示的なマイグレーション指定）
   * @param eventId イベントID
   * @param title タイトル
   * @param description 説明（JSON文字列）
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param targetVersion ターゲットバージョン
   * @returns WorkStateインスタンス
   */
  static createFromCalendarEventWithMigration(
    eventId: EventId,
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    targetVersion: SchemaVersion
  ): WorkState {
    const eventTitle = EventTitle.create(title);
    const { metadata, errors } = EventDescription.tryParse(description);

    if (!metadata) {
      return WorkStateFactory.createFromCorruptedEvent(
        eventId,
        title,
        description,
        startTime,
        endTime,
        errors
      );
    }

    // マイグレーション実行
    const migratedMetadata = MetadataMigrator.migrate(metadata, targetVersion);
    const migratedDescription = EventDescription.create(migratedMetadata);

    return WorkState.create(eventId, eventTitle, migratedDescription, startTime, endTime, migratedMetadata);
  }

  /**
   * 破損したカレンダーイベントからWorkStateを作成（部分的に読み込み可能な場合）
   * @param eventId イベントID
   * @param title タイトル
   * @param description 説明（JSON文字列、null可）
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param errors 検証エラーのリスト
   * @returns WorkStateインスタンス（isCorrupted: true）
   */
  static createFromCorruptedEvent(
    eventId: EventId,
    title: string,
    description: string | null,
    startTime: Date,
    endTime: Date,
    errors: ValidationError[]
  ): WorkState {
    if (errors.length === 0) {
      throw new Error('WorkStateFactory createFromCorruptedEvent requires at least one error');
    }

    const eventTitle = EventTitle.create(title);
    
    // 破損した説明文字列は保存せず、nullとして扱う
    // これにより、無効なJSONでもエラーが発生しない
    let eventDescription: EventDescription | null = null;
    if (description) {
      try {
        JSON.parse(description); // 有効なJSONかチェック
        eventDescription = EventDescription.fromString(description);
      } catch {
        // 無効なJSONの場合はnullのままにする
      }
    }

    const workState = WorkState.create(eventId, eventTitle, eventDescription, startTime, endTime, null);
    workState.markAsCorrupted(errors);
    return workState;
  }

  /**
   * 復元関係を含むWorkStateを作成
   * @param eventId イベントID
   * @param title タイトル
   * @param tabs タブ情報の配列
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param restoredFromEventId 復元元のイベントID
   * @param memo メモ（任意）
   * @returns WorkStateインスタンス
   */
  static createWithRestoreRelation(
    eventId: EventId,
    title: EventTitle,
    tabs: TabInfo[],
    startTime: Date,
    endTime: Date,
    restoredFromEventId: EventId,
    memo?: string
  ): WorkState {
    const workState = WorkStateFactory.createFromTabs(eventId, title, tabs, startTime, endTime, memo);
    workState.recordRestoredFrom(restoredFromEventId);
    return workState;
  }
}
