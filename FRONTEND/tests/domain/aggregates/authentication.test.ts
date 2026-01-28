import { Authentication } from '../../../src/domain/aggregates/authentication';
import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';

describe('Authentication', () => {
  const userId = 'user-123';
  const accessToken = AccessToken.create('valid-access-token-12345');
  const refreshToken = RefreshToken.create('valid-refresh-token-12345');
  const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));

  describe('create', () => {
    it('AuthStateからAuthentication Aggregateを作成できる', () => {
      const authState = AuthState.createUnauthenticated(userId);
      const authentication = Authentication.create(authState);

      expect(authentication).toBeDefined();
      expect(authentication.authState).toEqual(authState);
    });
  });

  describe('updateAuthState', () => {
    it('認証状態を更新できる（イミュータブル）', () => {
      const authState1 = AuthState.createUnauthenticated(userId);
      const authentication1 = Authentication.create(authState1);

      const authState2 = AuthState.createUnauthenticated(userId);
      authState2.authenticate(accessToken, refreshToken, tokenExpiry);
      const authentication2 = authentication1.updateAuthState(authState2);

      expect(authentication1.authState.isAuthenticated).toBe(false);
      expect(authentication2.authState.isAuthenticated).toBe(true);
      expect(authentication1).not.toBe(authentication2);
    });
  });
});
