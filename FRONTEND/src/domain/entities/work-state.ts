import { EventId } from '../value-objects/event-id';
import { EventTitle } from '../value-objects/event-title';
import { EventDescription } from '../value-objects/event-description';
import { WorkStateMetadata } from '../value-objects/work-state-metadata';
import { ValidationError } from '../value-objects/validation-error';
import { TabInfo } from '../value-objects/tab-info';

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

  /**
   * タブリスト全体を更新（Bolt 8: URL編集機能）
   * @param newTabs 新しいタブリスト
   * @returns 更新されたWorkStateインスタンス（イミュータビリティ）
   * @throws 空配列の場合、無効なインデックスの場合
   */
  updateTabs(newTabs: TabInfo[]): WorkState {
    // バリデーション
    const errors = this.validateTabList(newTabs);
    if (errors.length > 0) {
      const error = errors[0];
      throw new Error(error.errorMessage);
    }

    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to update tabs');
    }

    // 新しいメタデータを作成（イミュータビリティ）
    // 復元関係を保持するため、toJSON()を使用してからcreateFromRaw()を呼び出す
    const currentJson = this._metadata.toJSON();
    const updatedJson = {
      ...currentJson,
      tabs: newTabs.map((tab) => ({
        url: tab.url,
        title: tab.title,
        faviconUrl: tab.faviconUrl,
        index: tab.index,
        extensions: tab.extensions,
      })),
    };
    const updatedMetadata = WorkStateMetadata.createFromRaw(updatedJson, this._metadata.version);

    // 新しいWorkStateインスタンスを作成
    return WorkState.create(
      this._eventId,
      this._title,
      this._description,
      this._startTime,
      this._endTime,
      updatedMetadata
    );
  }

  /**
   * タブを追加（Bolt 8: URL編集機能）
   * @param tab 追加するタブ
   * @param index 追加位置（任意、指定しない場合は末尾）
   * @returns 更新されたWorkStateインスタンス（イミュータビリティ）
   * @throws 無効なTabInfoの場合、範囲外のインデックスの場合
   */
  addTab(tab: TabInfo, index?: number): WorkState {
    if (!tab) {
      throw new Error('Invalid tab information');
    }

    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to add tab');
    }

    const currentTabs = this._metadata.tabs;
    const insertIndex = index !== undefined ? index : currentTabs.length;

    // インデックスの範囲チェック
    if (insertIndex < 0 || insertIndex > currentTabs.length) {
      throw new Error('Index out of range');
    }

    // 新しいタブリストを作成
    const newTabs: TabInfo[] = [...currentTabs];
    newTabs.splice(insertIndex, 0, tab);

    // インデックスを再計算
    const reindexedTabs = newTabs.map((t, i) =>
      TabInfo.create({
        url: t.url,
        title: t.title,
        faviconUrl: t.faviconUrl,
        index: i,
        extensions: t.extensions,
      })
    );

    // updateTabsを使用して更新
    return this.updateTabs(reindexedTabs);
  }

  /**
   * タブを削除（Bolt 8: URL編集機能）
   * @param tabIndex 削除するタブのインデックス
   * @returns 更新されたWorkStateインスタンス（イミュータビリティ）
   * @throws 範囲外のインデックスの場合、最後の1つのタブを削除しようとした場合
   */
  removeTab(tabIndex: number): WorkState {
    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to remove tab');
    }

    const currentTabs = this._metadata.tabs;

    // インデックスの範囲チェック
    if (tabIndex < 0 || tabIndex >= currentTabs.length) {
      throw new Error('Index out of range');
    }

    // 最後の1つのタブは削除不可
    if (currentTabs.length === 1) {
      throw new Error('Cannot remove the last tab');
    }

    // 新しいタブリストを作成
    const newTabs = currentTabs.filter((_, i) => i !== tabIndex);

    // インデックスを再計算
    const reindexedTabs = newTabs.map((t, i) =>
      TabInfo.create({
        url: t.url,
        title: t.title,
        faviconUrl: t.faviconUrl,
        index: i,
        extensions: t.extensions,
      })
    );

    // updateTabsを使用して更新
    return this.updateTabs(reindexedTabs);
  }

  /**
   * タブの順序を変更（Bolt 8: URL編集機能）
   * @param fromIndex 移動元のインデックス
   * @param toIndex 移動先のインデックス
   * @returns 更新されたWorkStateインスタンス（イミュータビリティ）
   * @throws 範囲外のインデックスの場合
   */
  reorderTabs(fromIndex: number, toIndex: number): WorkState {
    if (!this._metadata) {
      throw new Error('WorkState metadata must exist to reorder tabs');
    }

    const currentTabs = this._metadata.tabs;

    // インデックスの範囲チェック
    if (fromIndex < 0 || fromIndex >= currentTabs.length) {
      throw new Error('Index out of range');
    }
    if (toIndex < 0 || toIndex >= currentTabs.length) {
      throw new Error('Index out of range');
    }

    // 新しいタブリストを作成
    const newTabs = [...currentTabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);

    // インデックスを再計算
    const reindexedTabs = newTabs.map((t, i) =>
      TabInfo.create({
        url: t.url,
        title: t.title,
        faviconUrl: t.faviconUrl,
        index: i,
        extensions: t.extensions,
      })
    );

    // updateTabsを使用して更新
    return this.updateTabs(reindexedTabs);
  }

  /**
   * タブリストの検証（Bolt 8: URL編集機能）
   * @param tabs 検証するタブリスト
   * @returns 検証エラーのリスト（エラーがない場合は空配列）
   */
  validateTabList(tabs: TabInfo[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // 空配列チェック
    if (!tabs || tabs.length === 0) {
      errors.push(
        ValidationError.create(
          'tabs',
          'EMPTY_TAB_LIST',
          'Tab list cannot be empty',
          'CRITICAL',
          false
        )
      );
      return errors; // 空配列の場合は他の検証をスキップ
    }

    // インデックスの連続性チェック
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].index !== i) {
        errors.push(
          ValidationError.create(
            `tabs[${i}].index`,
            'INVALID_TAB_INDICES',
            'Tab indices must be consecutive starting from 0',
            'CRITICAL',
            false
          )
        );
        break; // 最初のエラーで終了
      }
    }

    return errors;
  }
}
