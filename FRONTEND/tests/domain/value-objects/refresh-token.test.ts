import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';

describe('RefreshToken', () => {
  describe('作成', () => {
    it('有効なトークン値で作成できる', () => {
      const tokenValue = 'valid-refresh-token-12345';
      const token = RefreshToken.create(tokenValue);
      
      expect(token).toBeDefined();
      expect(token.value).toBe(tokenValue);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        RefreshToken.create('');
      }).toThrow('RefreshToken value cannot be empty');
    });

    it('最小長未満のトークンで作成しようとするとエラーを投げる', () => {
      expect(() => {
        RefreshToken.create('short');
      }).toThrow('RefreshToken value must be at least 10 characters');
    });
  });

  describe('等価性', () => {
    it('同じ値のトークンは等しい', () => {
      const token1 = RefreshToken.create('valid-refresh-token-12345');
      const token2 = RefreshToken.create('valid-refresh-token-12345');
      
      expect(token1.equals(token2)).toBe(true);
    });

    it('異なる値のトークンは等しくない', () => {
      const token1 = RefreshToken.create('valid-refresh-token-12345');
      const token2 = RefreshToken.create('different-refresh-token-67890');
      
      expect(token1.equals(token2)).toBe(false);
    });
  });
});
