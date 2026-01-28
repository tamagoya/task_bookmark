import { AuthStateFactory } from '../../../src/domain/factories/auth-state-factory';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';

describe('AuthStateFactory', () => {
  const userId = 'user-123';
  const accessToken = AccessToken.create('valid-access-token-12345');
  const refreshToken = RefreshToken.create('valid-refresh-token-12345');
  const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
  const calendarId = CalendarId.create('calendar-id-12345');

  describe('createUnauthenticated', () => {
    it('未認証状態のAuthStateを作成できる', () => {
      const authState = AuthStateFactory.createUnauthenticated(userId);
      
      expect(authState.userId).toBe(userId);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.accessToken).toBeNull();
    });

    it('空のユーザーIDで作成しようとするとエラーを投げる', () => {
      expect(() => {
        AuthStateFactory.createUnauthenticated('');
      }).toThrow('UserId cannot be empty');
    });
  });

  describe('createAuthenticated', () => {
    it('認証済み状態のAuthStateを作成できる', () => {
      const authState = AuthStateFactory.createAuthenticated(
        userId,
        accessToken,
        refreshToken,
        tokenExpiry
      );
      
      expect(authState.userId).toBe(userId);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.accessToken).toEqual(accessToken);
      expect(authState.refreshToken).toEqual(refreshToken);
      expect(authState.tokenExpiry).toEqual(tokenExpiry);
    });

    it('空のユーザーIDで作成しようとするとエラーを投げる', () => {
      expect(() => {
        AuthStateFactory.createAuthenticated('', accessToken, refreshToken, tokenExpiry);
      }).toThrow('UserId cannot be empty');
    });
  });

  describe('createWithCalendar', () => {
    it('認証済みかつカレンダー初期化済みのAuthStateを作成できる', () => {
      const authState = AuthStateFactory.createWithCalendar(
        userId,
        accessToken,
        refreshToken,
        tokenExpiry,
        calendarId
      );
      
      expect(authState.userId).toBe(userId);
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.accessToken).toEqual(accessToken);
      expect(authState.calendarId).toEqual(calendarId);
    });

    it('空のユーザーIDで作成しようとするとエラーを投げる', () => {
      expect(() => {
        AuthStateFactory.createWithCalendar('', accessToken, refreshToken, tokenExpiry, calendarId);
      }).toThrow('UserId cannot be empty');
    });
  });
});
