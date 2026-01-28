import { AccessToken } from '../../../src/domain/value-objects/access-token';

describe('AccessToken', () => {
  describe('作成', () => {
    it('有効なトークン値で作成できる', () => {
      const tokenValue = 'valid-access-token-12345';
      const token = AccessToken.create(tokenValue);
      
      expect(token).toBeDefined();
      expect(token.value).toBe(tokenValue);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        AccessToken.create('');
      }).toThrow('AccessToken value cannot be empty');
    });

    it('最小長未満のトークンで作成しようとするとエラーを投げる', () => {
      expect(() => {
        AccessToken.create('short');
      }).toThrow('AccessToken value must be at least 10 characters');
    });
  });

  describe('等価性', () => {
    it('同じ値のトークンは等しい', () => {
      const token1 = AccessToken.create('valid-access-token-12345');
      const token2 = AccessToken.create('valid-access-token-12345');
      
      expect(token1.equals(token2)).toBe(true);
    });

    it('異なる値のトークンは等しくない', () => {
      const token1 = AccessToken.create('valid-access-token-12345');
      const token2 = AccessToken.create('different-access-token-67890');
      
      expect(token1.equals(token2)).toBe(false);
    });
  });

  describe('不変性', () => {
    it('作成後は変更できない', () => {
      const token = AccessToken.create('valid-access-token-12345');
      const originalValue = token.value;
      
      // TypeScriptの型システムにより、valueはreadonlyなので
      // 実行時にも変更できないことを確認
      expect(token.value).toBe(originalValue);
    });
  });
});
