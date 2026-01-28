import { AuthState } from '../entities/auth-state';

/**
 * AuthRepository Interface
 * 認証状態の永続化を担当するRepositoryインターフェース
 */
export interface AuthRepository {
  /**
   * ユーザーIDで認証状態を取得
   * @param userId ユーザーID
   * @returns 認証状態、存在しない場合はnull
   */
  findByUserId(userId: string): Promise<AuthState | null>;

  /**
   * 認証状態を保存
   * @param authState 認証状態
   */
  save(authState: AuthState): Promise<void>;

  /**
   * 認証状態を削除
   * @param userId ユーザーID
   */
  delete(userId: string): Promise<void>;

  /**
   * 現在の認証状態を取得（シングルトン的な動作）
   * @returns 認証状態、存在しない場合はnull
   */
  getCurrent(): Promise<AuthState | null>;
}
