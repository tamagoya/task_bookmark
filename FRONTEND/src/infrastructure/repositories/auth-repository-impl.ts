import { AuthRepository } from '../../domain/repositories/auth-repository';
import { AuthState } from '../../domain/entities/auth-state';
import { AuthStateFactory } from '../../domain/factories/auth-state-factory';
import { AccessToken } from '../../domain/value-objects/access-token';
import { RefreshToken } from '../../domain/value-objects/refresh-token';
import { TokenExpiry } from '../../domain/value-objects/token-expiry';
import { CalendarId } from '../../domain/value-objects/calendar-id';

interface StoredAuthState {
  userId: string;
  isAuthenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  calendarId?: string;
}

/**
 * AuthRepositoryImpl
 * AuthRepositoryインターフェースの実装
 * Chrome Storage APIを使用した永続化
 */
export class AuthRepositoryImpl implements AuthRepository {
  private readonly STORAGE_KEY = 'authState';

  /**
   * ユーザーIDで認証状態を取得
   * @param userId ユーザーID
   * @returns 認証状態、存在しない場合はnull
   */
  async findByUserId(userId: string): Promise<AuthState | null> {
    const stored = await this._getStored();
    if (!stored || stored.userId !== userId) {
      return null;
    }
    return this._deserialize(stored);
  }

  /**
   * 認証状態を保存
   * @param authState 認証状態
   */
  async save(authState: AuthState): Promise<void> {
    const stored = this._serialize(authState);
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: stored }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 認証状態を削除
   * @param _userId ユーザーID（現在の実装では使用しないが、インターフェースの互換性のため保持）
   */
  async delete(_userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(this.STORAGE_KEY, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }

  /**
   * 現在の認証状態を取得
   * @returns 認証状態、存在しない場合はnull
   */
  async getCurrent(): Promise<AuthState | null> {
    const stored = await this._getStored();
    if (!stored) {
      return null;
    }
    return this._deserialize(stored);
  }

  /**
   * ストレージから認証状態を取得
   * @returns 保存された認証状態
   */
  private async _getStored(): Promise<StoredAuthState | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(this.STORAGE_KEY, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        const stored = result[this.STORAGE_KEY] as StoredAuthState | undefined;
        resolve(stored || null);
      });
    });
  }

  /**
   * AuthStateをシリアライズ
   * @param authState 認証状態
   * @returns シリアライズされたデータ
   */
  private _serialize(authState: AuthState): StoredAuthState {
    return {
      userId: authState.userId,
      isAuthenticated: authState.isAuthenticated,
      accessToken: authState.accessToken?.value,
      refreshToken: authState.refreshToken?.value,
      tokenExpiry: authState.tokenExpiry?.expiresAt.getTime(),
      calendarId: authState.calendarId?.value,
    };
  }

  /**
   * シリアライズされたデータをAuthStateにデシリアライズ
   * @param stored 保存されたデータ
   * @returns AuthStateインスタンス
   */
  private _deserialize(stored: StoredAuthState): AuthState {
    if (!stored.isAuthenticated) {
      return AuthStateFactory.createUnauthenticated(stored.userId);
    }

    if (!stored.accessToken || !stored.refreshToken || !stored.tokenExpiry) {
      throw new Error('Invalid stored auth state: missing required fields');
    }

    const expiryDate = new Date(stored.tokenExpiry);
    if (expiryDate <= new Date()) {
      return AuthStateFactory.createUnauthenticated(stored.userId);
    }

    const accessToken = AccessToken.create(stored.accessToken);
    const refreshToken = RefreshToken.create(stored.refreshToken);
    const tokenExpiry = TokenExpiry.create(expiryDate);

    if (stored.calendarId) {
      const calendarId = CalendarId.create(stored.calendarId);
      return AuthStateFactory.createWithCalendar(
        stored.userId,
        accessToken,
        refreshToken,
        tokenExpiry,
        calendarId
      );
    }

    return AuthStateFactory.createAuthenticated(
      stored.userId,
      accessToken,
      refreshToken,
      tokenExpiry
    );
  }
}
