import { ErrorMessage } from '../../../src/domain/value-objects/error-message';

describe('ErrorMessage', () => {
  describe('作成', () => {
    it('有効なメッセージで作成できる', () => {
      const message = '認証に失敗しました';
      const errorMessage = ErrorMessage.create(message);
      
      expect(errorMessage).toBeDefined();
      expect(errorMessage.message).toBe(message);
      expect(errorMessage.technicalDetails).toBeUndefined();
    });

    it('技術的な詳細を含めて作成できる', () => {
      const message = '認証に失敗しました';
      const technicalDetails = 'Invalid token: expired';
      const errorMessage = ErrorMessage.create(message, technicalDetails);
      
      expect(errorMessage.message).toBe(message);
      expect(errorMessage.technicalDetails).toBe(technicalDetails);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        ErrorMessage.create('');
      }).toThrow('ErrorMessage message cannot be empty');
    });
  });

  describe('toUserFriendlyString', () => {
    it('ユーザー向けの文字列表現を返す', () => {
      const message = '認証に失敗しました';
      const technicalDetails = 'Invalid token: expired';
      const errorMessage = ErrorMessage.create(message, technicalDetails);
      
      expect(errorMessage.toUserFriendlyString()).toBe(message);
      expect(errorMessage.toUserFriendlyString()).not.toContain(technicalDetails);
    });
  });

  describe('等価性', () => {
    it('同じメッセージのエラーメッセージは等しい', () => {
      const errorMessage1 = ErrorMessage.create('認証に失敗しました');
      const errorMessage2 = ErrorMessage.create('認証に失敗しました');
      
      expect(errorMessage1.equals(errorMessage2)).toBe(true);
    });

    it('異なるメッセージのエラーメッセージは等しくない', () => {
      const errorMessage1 = ErrorMessage.create('認証に失敗しました');
      const errorMessage2 = ErrorMessage.create('ネットワークエラーが発生しました');
      
      expect(errorMessage1.equals(errorMessage2)).toBe(false);
    });
  });
});
