import { EventId } from '../value-objects/event-id';
import { EventTitle } from '../value-objects/event-title';
import { EventDescription } from '../value-objects/event-description';
import { WorkStateMetadata } from '../value-objects/work-state-metadata';
import { ValidationError } from '../value-objects/validation-error';

/**
 * WorkState Entity
 * 仕事状態を表すエンティティ
 */
export class WorkState {
  private _description: EventDescription | null;
  private _metadata: WorkStateMetadata | null;
  private _validationErrors: ValidationError[] = [];
  private _isCorrupted: boolean = false;

  private constructor(
    private readonly _eventId: EventId,
    private _title: EventTitle,
    description: EventDescription | null,
    private readonly _startTime: Date,
    private readonly _endTime: Date,
    metadata: WorkStateMetadata | null
  ) {
    this._description = description;
    this._metadata = metadata;

    // ビジネスルール: 時間の一貫性（破損時は緩和可能）
    if (_startTime >= _endTime && !this._isCorrupted) {
      throw new Error('WorkState startTime must be before endTime');
    }
  }

  /**
   * WorkStateを作成
   * @param eventId イベントID
   * @param title タイトル
   * @param description 説明（任意）
   * @param startTime 開始時刻
   * @param endTime 終了時刻
   * @param metadata メタデータ（任意）
   * @returns WorkStateインスタンス
   */
  static create(
    eventId: EventId,
    title: EventTitle,
    description: EventDescription | null,
    startTime: Date,
    endTime: Date,
    metadata: WorkStateMetadata | null
  ): WorkState {
    return new WorkState(eventId, title, description, startTime, endTime, metadata);
  }

  /**
   * イベントIDを取得
   */
  get eventId(): EventId {
    return this._eventId;
  }

  /**
   * タイトルを取得
   */
  get title(): EventTitle {
    return this._title;
  }

  /**
   * 説明を取得
   */
  get description(): EventDescription | null {
    return this._description;
  }

  /**
   * 開始時刻を取得
   */
  get startTime(): Date {
    return new Date(this._startTime); // イミュータビリティのためコピーを返す
  }

  /**
   * 終了時刻を取得
   */
  get endTime(): Date {
    return new Date(this._endTime); // イミュータビリティのためコピーを返す
  }

  /**
   * メタデータを取得
   */
  get metadata(): WorkStateMetadata | null {
    return this._metadata;
  }

  /**
   * 検証エラーのリストを取得
   */
  get validationErrors(): ValidationError[] {
    return [...this._validationErrors]; // イミュータビリティのためコピーを返す
  }

  /**
   * データが破損しているかどうか
   */
  get isCorrupted(): boolean {
    return this._isCorrupted;
  }

  /**
   * タイトルを更新
   * @param newTitle 新しいタイトル
   */
  updateTitle(newTitle: EventTitle): void {
    if (!newTitle) {
      throw new Error('WorkState title cannot be null');
    }
    this._title = newTitle;
  }

  /**
   * メタデータを更新
   * @param newMetadata 新しいメタデータ
   */
  updateMetadata(newMetadata: WorkStateMetadata): void {
    if (!newMetadata) {
      throw new Error('WorkState metadata cannot be null');
    }
    this._metadata = newMetadata;
    // メタデータが更新されたら、破損状態を解除
    if (this._isCorrupted) {
      this._isCorrupted = false;
      this._validationErrors = [];
    }
  }

  /**
   * 復元関係を記録（この仕事状態から別の仕事状態への復元）
   * @param restoredToEventId 復元先のイベントID
   * @param restoredAt 復元日時
   */
  recordRestoreRelation(restoredToEventId: EventId, restoredAt: Date): void {
    if (!restoredToEventId) {
      throw new Error('WorkState restoredToEventId cannot be null');
    }
    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to record restore relation');
    }

    const currentRestoredTo = this._metadata.restoredTo || [];
    // 同じイベントIDが既に存在するかチェック
    const alreadyExists = currentRestoredTo.some(
      (entry) => entry.eventId === restoredToEventId.value
    );
    if (!alreadyExists) {
      const newRestoredTo = [
        ...currentRestoredTo,
        {
          eventId: restoredToEventId.value,
          restoredAt: restoredAt.toISOString(),
        },
      ];
      // メタデータを更新（イミュータビリティのため新しいインスタンスを作成）
      const updatedMetadata = WorkStateMetadata.createFromRaw(
        {
          ...this._metadata.toJSON(),
          restoredTo: newRestoredTo,
        },
        this._metadata.version
      );
      this._metadata = updatedMetadata;
    }
  }

  /**
   * 復元元を記録（この仕事状態が別の仕事状態から復元された）
   * @param restoredFromEventId 復元元のイベントID
   */
  recordRestoredFrom(restoredFromEventId: EventId): void {
    if (!restoredFromEventId) {
      throw new Error('WorkState restoredFromEventId cannot be null');
    }
    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to record restored from');
    }

    // メタデータを更新（イミュータビリティのため新しいインスタンスを作成）
    const updatedMetadata = WorkStateMetadata.createFromRaw(
      {
        ...this._metadata.toJSON(),
        restoredFrom: restoredFromEventId.value,
      },
      this._metadata.version
    );
    this._metadata = updatedMetadata;
  }

  /**
   * データが破損していることをマーク
   * @param errors 検証エラーのリスト
   */
  markAsCorrupted(errors: ValidationError[]): void {
    if (!errors || errors.length === 0) {
      throw new Error('WorkState errors cannot be empty when marking as corrupted');
    }
    this._isCorrupted = true;
    this._validationErrors = [...errors]; // イミュータビリティのためコピーを保存
  }

  /**
   * 破損しているフィールドのリストを取得
   * @returns 破損フィールド名の配列
   */
  getCorruptedFields(): string[] {
    return this._validationErrors.map((error) => error.field);
  }

  /**
   * 部分的に読み込み可能かどうかを判定
   * @returns titleとeventIdが有効であればtrue
   */
  canPartiallyLoad(): boolean {
    return this._eventId !== null && this._title !== null;
  }
}
