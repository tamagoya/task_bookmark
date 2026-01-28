import { AuthRepository } from '../../domain/repositories/auth-repository';
import { GoogleCalendarAdapter } from '../../infrastructure/adapters/google-calendar-adapter';
import { CalendarId } from '../../domain/value-objects/calendar-id';

/**
 * CalendarInitializationService
 * カレンダーの初期化を担当
 */
export class CalendarInitializationService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly calendarAdapter: GoogleCalendarAdapter
  ) {}

  /**
   * 専用カレンダーの存在確認と作成
   * @returns カレンダーID
   * @throws 認証エラー、カレンダー作成エラー
   */
  async ensureCalendarExists(): Promise<CalendarId> {
    const authState = await this.authRepository.getCurrent();
    if (!authState || !authState.isAuthenticated) {
      throw new Error('User is not authenticated');
    }

    if (!authState.accessToken) {
      throw new Error('Access token is missing');
    }

    // 既にカレンダーIDが設定されている場合は、それを返す
    if (authState.calendarId) {
      return authState.calendarId;
    }

    // カレンダーを検索または作成
    const calendarId = await this.calendarAdapter.findOrCreateCalendar(
      authState.accessToken.value
    );

    // 認証状態にカレンダーIDを設定
    authState.initializeCalendar(calendarId);
    await this.authRepository.save(authState);

    return calendarId;
  }

  /**
   * カレンダーIDを取得
   * @returns カレンダーID、存在しない場合はnull
   */
  async getCalendarId(): Promise<CalendarId | null> {
    const authState = await this.authRepository.getCurrent();
    return authState?.calendarId ?? null;
  }
}
