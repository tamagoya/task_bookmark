import { WorkState } from '../entities/work-state';
import { EventId } from '../value-objects/event-id';
import { CalendarId } from '../value-objects/calendar-id';
import { AccessToken } from '../value-objects/access-token';

/**
 * CalendarEventRepository Interface
 * カレンダーイベントの永続化を担当するRepositoryインターフェース
 */
export interface CalendarEventRepository {
  /**
   * 仕事状態をカレンダーイベントとして保存
   * @param workState 仕事状態
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 作成されたイベントID
   */
  save(
    workState: WorkState,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<EventId>;

  /**
   * イベントIDで仕事状態を取得
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 見つかった場合はWorkState、見つからない場合はnull
   * @note データが破損している場合でも、部分的に読み込み可能であればWorkStateを返す（isCorrupted: true）
   */
  findById(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState | null>;

  /**
   * 日付範囲で仕事状態の一覧を取得
   * @param startDate 開始日
   * @param endDate 終了日
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 該当する仕事状態の配列（破損データも含む）
   * @note データが破損している場合でも、部分的に読み込み可能であればWorkStateを返す（isCorrupted: true）
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<WorkState[]>;

  /**
   * 仕事状態を更新
   * @param workState 仕事状態
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @note イベントIDが既に存在する必要がある
   */
  update(
    workState: WorkState,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void>;

  /**
   * 仕事状態を削除
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @note イベントIDが既に存在する必要がある
   */
  delete(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void>;

  /**
   * イベントの説明欄に eventId を追加して PATCH する（Google Calendar GUI の復元ボタン用）
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   */
  patchDescriptionToIncludeEventId(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<void>;
}
