/**
 * UIMessenger
 * Service WorkerとUI間のメッセージパッシングを担当
 */
export interface Message {
  type: string;
  payload?: unknown;
}

export class UIMessenger {
  /**
   * メッセージを送信
   * @param message メッセージ
   */
  async sendMessage(message: Message): Promise<void> {
    try {
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      // メッセージ送信エラーはログに記録するが、処理は続行
      console.error('Failed to send message:', error);
    }
  }

  /**
   * メッセージを受信
   * @param callback メッセージ受信時のコールバック
   */
  onMessage(callback: (message: Message) => void): void {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      try {
        callback(message);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: String(error) });
      }
      return true; // 非同期レスポンスを許可
    });
  }
}
