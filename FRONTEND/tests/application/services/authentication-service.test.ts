import { AuthenticationService } from '../../../src/application/services/authentication-service';
import { ChromeIdentityAdapter } from '../../../src/infrastructure/adapters/chrome-identity-adapter';
import { AuthRepositoryImpl } from '../../../src/infrastructure/repositories/auth-repository-impl';
import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';

// モック
jest.mock('../../../src/infrastructure/adapters/chrome-identity-adapter');
jest.mock('../../../src/infrastructure/repositories/auth-repository-impl');

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let identityAdapter: jest.Mocked<ChromeIdentityAdapter>;
  let repository: jest.Mocked<AuthRepositoryImpl>;

  beforeEach(() => {
    identityAdapter = new ChromeIdentityAdapter() as jest.Mocked<ChromeIdentityAdapter>;
    repository = new AuthRepositoryImpl() as jest.Mocked<AuthRepositoryImpl>;
    service = new AuthenticationService(identityAdapter, repository);
  });

  describe('authenticate', () => {
    it('正常に認証できる', async () => {
      const token = 'test-access-token';
      identityAdapter.getAuthToken.mockResolvedValue(token);
      repository.getCurrent.mockResolvedValue(null);
      repository.save.mockResolvedValue();

      const result = await service.authenticate();

      expect(result).toBeDefined();
      expect(identityAdapter.getAuthToken).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('認証エラーが発生した場合はエラーを投げる', async () => {
      identityAdapter.getAuthToken.mockRejectedValue(new Error('Authentication failed'));

      await expect(service.authenticate()).rejects.toThrow('Authentication failed');
    });
  });

  describe('isAuthenticated', () => {
    it('認証済みの場合はtrueを返す', async () => {
      const authState = AuthState.createUnauthenticated('user-123');
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = require('../../../src/domain/value-objects/refresh-token').RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      repository.getCurrent.mockResolvedValue(authState);

      const result = await service.isAuthenticated();

      expect(result).toBe(true);
    });

    it('未認証の場合はfalseを返す', async () => {
      repository.getCurrent.mockResolvedValue(null);

      const result = await service.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('logout', () => {
    it('正常にログアウトできる', async () => {
      const authState = AuthState.createUnauthenticated('user-123');
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = require('../../../src/domain/value-objects/refresh-token').RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      
      repository.getCurrent.mockResolvedValue(authState);
      repository.save.mockResolvedValue();
      identityAdapter.removeCachedAuthToken.mockResolvedValue();

      await service.logout();

      expect(repository.save).toHaveBeenCalled();
      expect(identityAdapter.removeCachedAuthToken).toHaveBeenCalled();
    });
  });
});
