import { RestoreService } from './restore-service';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { PerformanceInterceptor } from '../decorators/performance-interceptor';

/**
 * OptimizedRestoreService
 * パフォーマンス監視が統合された仕事状態復元サービス
 * 
 * ADR-026に準拠: Decoratorパターンで既存サービスをラップ
 * 
 * NFR要件:
 * - タブの復元（10個）: 5秒以内
 */
export class OptimizedRestoreService {
  constructor(
    private readonly baseService: RestoreService,
    private readonly performanceInterceptor: PerformanceInterceptor
  ) {}

  /**
   * 仕事状態を復元
   * パフォーマンス監視: 5秒以内（10タブ）
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @param onProgress 進捗コールバック（任意）
   * @returns 復元結果（ウィンドウID、タブIDの配列）
   */
  async restoreWorkState(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken,
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ windowId: number; tabIds: number[] }> {
    return this.performanceInterceptor.intercept(
      'restoreWorkState',
      () => this.baseService.restoreWorkState(eventId, calendarId, accessToken, onProgress)
    );
  }
}
