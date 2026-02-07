import { AuthRepositoryImpl } from '../../../src/infrastructure/repositories/auth-repository-impl';
import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';

// Chrome Storage APIのモック
const mockStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
};

const mockChromeRuntime = {
  lastError: undefined as chrome.runtime.LastError | undefined,
};

// @ts-expect-error - Chrome APIのモック
global.chrome = {
  storage: mockStorage,
  runtime: mockChromeRuntime,
} as typeof chrome;

describe('AuthRepositoryImpl', () => {
  let repository: AuthRepositoryImpl;
  const userId = 'user-123';

  beforeEach(() => {
    repository = new AuthRepositoryImpl();
    jest.clearAllMocks();
    mockChromeRuntime.lastError = undefined;
  });

  describe('save', () => {
    it('認証状態を保存できる', async () => {
      const authState = AuthState.createUnauthenticated(userId);
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      authState.authenticate(accessToken, refreshToken, tokenExpiry);

      mockStorage.local.set.mockImplementation((_data, callback) => {
        callback();
      });

      await repository.save(authState);

      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          authState: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('保存エラーが発生した場合はエラーを投げる', async () => {
      const authState = AuthState.createUnauthenticated(userId);
      const errorMessage = 'Storage error';
      
      mockStorage.local.set.mockImplementation((_data, callback) => {
        mockChromeRuntime.lastError = { message: errorMessage };
        callback();
      });

      await expect(repository.save(authState)).rejects.toThrow(errorMessage);
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('getCurrent', () => {
    it('保存された認証状態を取得できる', async () => {
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);

      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId: authState.userId,
            isAuthenticated: authState.isAuthenticated,
            accessToken: authState.accessToken?.value,
            refreshToken: authState.refreshToken?.value,
            tokenExpiry: authState.tokenExpiry?.expiresAt.getTime(),
            calendarId: authState.calendarId?.value,
          },
        });
      });

      const result = await repository.getCurrent();

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
    });

    it('認証状態が存在しない場合はnullを返す', async () => {
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({});
      });

      const result = await repository.getCurrent();

      expect(result).toBeNull();
    });

    it('取得エラーが発生した場合はエラーを投げる', async () => {
      const errorMessage = 'Storage error';
      
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        mockChromeRuntime.lastError = { message: errorMessage };
        callback({});
      });

      await expect(repository.getCurrent()).rejects.toThrow(errorMessage);
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('findByUserId', () => {
    it('ユーザーIDで認証状態を取得できる', async () => {
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId,
            isAuthenticated: true,
            accessToken: accessToken.value,
            refreshToken: refreshToken.value,
            tokenExpiry: tokenExpiry.expiresAt.getTime(),
          },
        });
      });

      const result = await repository.findByUserId(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
    });

    it('異なるユーザーIDの場合はnullを返す', async () => {
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId: 'different-user',
            isAuthenticated: true,
          },
        });
      });

      const result = await repository.findByUserId(userId);

      expect(result).toBeNull();
    });

    it('認証状態が存在しない場合はnullを返す', async () => {
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({});
      });

      const result = await repository.findByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('認証状態を削除できる', async () => {
      mockStorage.local.remove.mockImplementation((_keys, callback) => {
        callback();
      });

      await repository.delete(userId);

      expect(mockStorage.local.remove).toHaveBeenCalledWith(
        'authState',
        expect.any(Function)
      );
    });

    it('削除エラーが発生した場合はエラーを投げる', async () => {
      const errorMessage = 'Storage error';
      
      mockStorage.local.remove.mockImplementation((_keys, callback) => {
        mockChromeRuntime.lastError = { message: errorMessage };
        callback();
      });

      await expect(repository.delete(userId)).rejects.toThrow(errorMessage);
      mockChromeRuntime.lastError = undefined;
    });
  });

  describe('_deserialize', () => {
    it('無効な認証状態の場合はエラーを投げる', async () => {
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId,
            isAuthenticated: true,
            // 必須フィールドが不足
          },
        });
      });

      await expect(repository.getCurrent()).rejects.toThrow('Invalid stored auth state: missing required fields');
    });

    it('カレンダーIDが設定されている場合は、カレンダーIDを含むAuthStateを作成する', async () => {
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      const calendarId = 'calendar-id-12345';
      
      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId,
            isAuthenticated: true,
            accessToken: accessToken.value,
            refreshToken: refreshToken.value,
            tokenExpiry: tokenExpiry.expiresAt.getTime(),
            calendarId,
          },
        });
      });

      const result = await repository.getCurrent();

      expect(result).toBeDefined();
      expect(result?.calendarId?.value).toBe(calendarId);
    });

    it('tokenExpiryが過去の場合は未認証のAuthStateを返し、TokenExpiryの検証エラーを投げない', async () => {
      const pastExpiry = Date.now() - 3600000;

      mockStorage.local.get.mockImplementation((_keys, callback) => {
        callback({
          authState: {
            userId,
            isAuthenticated: true,
            accessToken: 'valid-access-token',
            refreshToken: 'valid-refresh-token',
            tokenExpiry: pastExpiry,
          },
        });
      });

      const result = await repository.getCurrent();

      expect(result).toBeDefined();
      expect(result?.isAuthenticated).toBe(false);
      expect(result?.userId).toBe(userId);
    });
  });
});
