import { AuthState } from '../entities/auth-state';
import { AccessToken } from '../value-objects/access-token';
import { RefreshToken } from '../value-objects/refresh-token';
import { TokenExpiry } from '../value-objects/token-expiry';
import { CalendarId } from '../value-objects/calendar-id';

/**
 * AuthStateFactory
 * AuthStateの作成を担当するFactory
 */
export class AuthStateFactory {
  /**
   * 未認証状態のAuthStateを作成
   * @param userId ユーザーID
   * @returns AuthStateインスタンス
   */
  static createUnauthenticated(userId: string): AuthState {
    return AuthState.createUnauthenticated(userId);
  }

  /**
   * 認証済み状態のAuthStateを作成
   * @param userId ユーザーID
   * @param accessToken アクセストークン
   * @param refreshToken リフレッシュトークン
   * @param tokenExpiry トークンの有効期限
   * @returns AuthStateインスタンス
   */
  static createAuthenticated(
    userId: string,
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    tokenExpiry: TokenExpiry
  ): AuthState {
    const authState = AuthState.createUnauthenticated(userId);
    authState.authenticate(accessToken, refreshToken, tokenExpiry);
    return authState;
  }

  /**
   * 認証済みかつカレンダー初期化済みのAuthStateを作成
   * @param userId ユーザーID
   * @param accessToken アクセストークン
   * @param refreshToken リフレッシュトークン
   * @param tokenExpiry トークンの有効期限
   * @param calendarId カレンダーID
   * @returns AuthStateインスタンス
   */
  static createWithCalendar(
    userId: string,
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    tokenExpiry: TokenExpiry,
    calendarId: CalendarId
  ): AuthState {
    const authState = AuthStateFactory.createAuthenticated(
      userId,
      accessToken,
      refreshToken,
      tokenExpiry
    );
    authState.initializeCalendar(calendarId);
    return authState;
  }
}
