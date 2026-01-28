import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';

describe('AuthState', () => {
  const userId = 'user-123';
  const accessToken = AccessToken.create('valid-access-token-12345');
  const refreshToken = RefreshToken.create('valid-refresh-token-12345');
  const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));

  describe('作成', () => {
    it('未認証状態で作成できる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      
      expect(authState.userId).toBe(userId);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBeNull();
      expect(authState.refreshToken).toBeNull();
      expect(authState.tokenExpiry).toBeNull();
      expect(authState.calendarId).toBeNull();
    });
  });

  describe('authenticate', () => {
    it('認証状態を設定できる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.accessToken).toEqual(accessToken);
      expect(authState.refreshToken).toEqual(refreshToken);
      expect(authState.tokenExpiry).toEqual(tokenExpiry);
    });

    it('認証時にUserAuthenticatedイベントを発行する', () => {
      const authState = AuthState.createUnauthenticated(userId);
      const events: unknown[] = [];
      authState.onEvent((event) => events.push(event));
      
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('userId', userId);
      expect(events[0]).toHaveProperty('authenticatedAt');
    });
  });

  describe('refreshToken', () => {
    it('トークンを更新できる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      const newAccessToken = AccessToken.create('new-access-token-67890');
      const newTokenExpiry = TokenExpiry.create(new Date(Date.now() + 7200000));
      
      authState.refreshAccessToken(newAccessToken, newTokenExpiry);
      
      expect(authState.accessToken).toEqual(newAccessToken);
      expect(authState.tokenExpiry).toEqual(newTokenExpiry);
    });

    it('未認証状態でトークン更新しようとするとエラーを投げる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      const newAccessToken = AccessToken.create('new-access-token-67890');
      const newTokenExpiry = TokenExpiry.create(new Date(Date.now() + 7200000));
      
      expect(() => {
        authState.refreshAccessToken(newAccessToken, newTokenExpiry);
      }).toThrow('Cannot refresh token: user is not authenticated');
    });

    it('トークン更新時にTokenRefreshedイベントを発行する', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      const events: unknown[] = [];
      authState.onEvent((event) => events.push(event));
      
      const newAccessToken = AccessToken.create('new-access-token-67890');
      const newTokenExpiry = TokenExpiry.create(new Date(Date.now() + 7200000));
      authState.refreshAccessToken(newAccessToken, newTokenExpiry);
      
      const refreshEvents = events.filter(e => 
        typeof e === 'object' && e !== null && 'refreshedAt' in e
      );
      expect(refreshEvents).toHaveLength(1);
    });
  });

  describe('logout', () => {
    it('認証状態をクリアできる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      authState.logout();
      
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBeNull();
      expect(authState.refreshToken).toBeNull();
      expect(authState.tokenExpiry).toBeNull();
      expect(authState.calendarId).toBeNull();
    });

    it('ログアウト時にUserLoggedOutイベントを発行する', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      const events: unknown[] = [];
      authState.onEvent((event) => events.push(event));
      
      authState.logout();
      
      const logoutEvents = events.filter(e => 
        typeof e === 'object' && e !== null && 'loggedOutAt' in e
      );
      expect(logoutEvents).toHaveLength(1);
    });
  });

  describe('initializeCalendar', () => {
    it('カレンダーIDを設定できる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      const calendarId = CalendarId.create('calendar-id-12345');
      authState.initializeCalendar(calendarId);
      
      expect(authState.calendarId).toEqual(calendarId);
    });

    it('未認証状態でカレンダー初期化しようとするとエラーを投げる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      const calendarId = CalendarId.create('calendar-id-12345');
      
      expect(() => {
        authState.initializeCalendar(calendarId);
      }).toThrow('Cannot initialize calendar: user is not authenticated');
    });

    it('カレンダー初期化時にCalendarInitializedイベントを発行する', () => {
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      const events: unknown[] = [];
      authState.onEvent((event) => events.push(event));
      
      const calendarId = CalendarId.create('calendar-id-12345');
      authState.initializeCalendar(calendarId);
      
      const initEvents = events.filter(e => 
        typeof e === 'object' && e !== null && 'initializedAt' in e
      );
      expect(initEvents).toHaveLength(1);
    });
  });

  describe('isTokenExpired', () => {
    it('未来の有効期限は期限切れでない', () => {
      const authState = AuthState.createUnauthenticated(userId);
      const futureExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      authState.authenticate(accessToken, refreshToken, futureExpiry);
      
      expect(authState.isTokenExpired()).toBe(false);
    });

    it('トークンがない場合はtrueを返す', () => {
      const authState = AuthState.createUnauthenticated(userId);
      
      expect(authState.isTokenExpired()).toBe(true);
    });
  });
});
