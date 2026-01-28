/**
 * ChromeIdentityAdapter
 * Chrome Identity APIのラッパー
 */
export class ChromeIdentityAdapter {
  /**
   * OAuth 2.0トークンを取得
   * @returns アクセストークン
   * @throws 認証エラー
   */
  async getAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(
        { interactive: true },
        (token?: string) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message));
            return;
          }
          if (!token) {
            reject(new Error('Failed to get auth token'));
            return;
          }
          resolve(token);
        }
      );
    });
  }

  /**
   * キャッシュされたトークンを削除
   * @param token 削除するトークン
   */
  async removeCachedAuthToken(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve();
      });
    });
  }
}
