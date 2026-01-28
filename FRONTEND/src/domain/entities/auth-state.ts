import { AccessToken } from '../value-objects/access-token';
import { RefreshToken } from '../value-objects/refresh-token';
import { TokenExpiry } from '../value-objects/token-expiry';
import { CalendarId } from '../value-objects/calendar-id';
import { UserAuthenticated } from '../events/user-authenticated';
import { TokenRefreshed } from '../events/token-refreshed';
import { UserLoggedOut } from '../events/user-logged-out';
import { CalendarInitialized } from '../events/calendar-initialized';

/**
 * AuthState Entity
 * 認証状態を表すエンティティ
 */
export class AuthState {
  private _accessToken: AccessToken | null = null;
  private _refreshToken: RefreshToken | null = null;
  private _tokenExpiry: TokenExpiry | null = null;
  private _calendarId: CalendarId | null = null;
  private _isAuthenticated: boolean = false;
  private _eventHandlers: Array<(event: unknown) => void> = [];

  private constructor(private readonly _userId: string) {}

  /**
   * 未認証状態のAuthStateを作成
   * @param userId ユーザーID
   * @returns AuthStateインスタンス
   */
  static createUnauthenticated(userId: string): AuthState {
    if (!userId || userId.trim().length === 0) {
      throw new Error('UserId cannot be empty');
    }
    return new AuthState(userId);
  }

  /**
   * ユーザーIDを取得
   */
  get userId(): string {
    return this._userId;
  }

  /**
   * 認証済みかどうか
   */
  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  /**
   * アクセストークンを取得
   */
  get accessToken(): AccessToken | null {
    return this._accessToken;
  }

  /**
   * リフレッシュトークンを取得
   */
  get refreshToken(): RefreshToken | null {
    return this._refreshToken;
  }

  /**
   * トークンの有効期限を取得
   */
  get tokenExpiry(): TokenExpiry | null {
    return this._tokenExpiry;
  }

  /**
   * カレンダーIDを取得
   */
  get calendarId(): CalendarId | null {
    return this._calendarId;
  }

  /**
   * 認証状態を設定
   * @param accessToken アクセストークン
   * @param refreshToken リフレッシュトークン
   * @param expiry 有効期限
   */
  authenticate(
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    expiry: TokenExpiry
  ): void {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;
    this._tokenExpiry = expiry;
    this._isAuthenticated = true;

    this._emitEvent(
      new UserAuthenticated(this._userId, new Date())
    );
  }

  /**
   * トークンを更新
   * @param newAccessToken 新しいアクセストークン
   * @param newExpiry 新しい有効期限
   */
  refreshAccessToken(newAccessToken: AccessToken, newExpiry: TokenExpiry): void {
    if (!this._isAuthenticated) {
      throw new Error('Cannot refresh token: user is not authenticated');
    }

    this._accessToken = newAccessToken;
    this._tokenExpiry = newExpiry;

    this._emitEvent(
      new TokenRefreshed(this._userId, new Date(), newExpiry.expiresAt)
    );
  }

  /**
   * ログアウト（認証状態をクリア）
   */
  logout(): void {
    this._accessToken = null;
    this._refreshToken = null;
    this._tokenExpiry = null;
    this._calendarId = null;
    this._isAuthenticated = false;

    this._emitEvent(
      new UserLoggedOut(this._userId, new Date())
    );
  }

  /**
   * カレンダーIDを設定
   * @param calendarId カレンダーID
   */
  initializeCalendar(calendarId: CalendarId): void {
    if (!this._isAuthenticated) {
      throw new Error('Cannot initialize calendar: user is not authenticated');
    }

    this._calendarId = calendarId;

    this._emitEvent(
      new CalendarInitialized(this._userId, calendarId.value, new Date())
    );
  }

  /**
   * トークンが期限切れかどうかを判定
   * @returns 期限切れの場合true
   */
  isTokenExpired(): boolean {
    if (!this._tokenExpiry) {
      return true;
    }
    return this._tokenExpiry.isExpired();
  }

  /**
   * イベントハンドラーを登録
   * @param handler イベントハンドラー
   */
  onEvent(handler: (event: unknown) => void): void {
    this._eventHandlers.push(handler);
  }

  /**
   * イベントを発行
   * @param event イベント
   */
  private _emitEvent(event: unknown): void {
    this._eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        // イベントハンドラーのエラーはログに記録するが、処理は続行
        console.error('Error in event handler:', error);
      }
    });
  }
}
