import { WorkState } from '../entities/work-state';

/**
 * TaskBookmark Aggregate Root
 * 仕事状態（タスクブックマーク）の集約ルート
 * カレンダーイベントとメタデータを一貫性のある単位として管理
 */
export class TaskBookmark {
  private constructor(private readonly _workState: WorkState) {}

  /**
   * TaskBookmark Aggregateを作成
   * @param workState 仕事状態
   * @returns TaskBookmarkインスタンス
   */
  static create(workState: WorkState): TaskBookmark {
    return new TaskBookmark(workState);
  }

  /**
   * 仕事状態を取得
   */
  get workState(): WorkState {
    return this._workState;
  }

  /**
   * 仕事状態を更新
   * @param workState 新しい仕事状態
   * @returns 新しいTaskBookmarkインスタンス（イミュータブル）
   */
  updateWorkState(workState: WorkState): TaskBookmark {
    return new TaskBookmark(workState);
  }
}
