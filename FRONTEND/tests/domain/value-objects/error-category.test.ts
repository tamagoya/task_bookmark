import { ErrorCategory } from '../../../src/domain/value-objects/error-category';

describe('ErrorCategory', () => {
  describe('値の定義', () => {
    it('AUTHENTICATIONが定義されている', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe('AUTHENTICATION');
    });

    it('NETWORKが定義されている', () => {
      expect(ErrorCategory.NETWORK).toBe('NETWORK');
    });

    it('APIが定義されている', () => {
      expect(ErrorCategory.API).toBe('API');
    });

    it('VALIDATIONが定義されている', () => {
      expect(ErrorCategory.VALIDATION).toBe('VALIDATION');
    });

    it('DATAが定義されている', () => {
      expect(ErrorCategory.DATA).toBe('DATA');
    });

    it('SYSTEMが定義されている', () => {
      expect(ErrorCategory.SYSTEM).toBe('SYSTEM');
    });
  });

  describe('等価性', () => {
    it('同じ値のカテゴリは等しい', () => {
      expect(ErrorCategory.AUTHENTICATION).toBe(ErrorCategory.AUTHENTICATION);
    });

    it('異なる値のカテゴリは等しくない', () => {
      expect(ErrorCategory.AUTHENTICATION).not.toBe(ErrorCategory.NETWORK);
    });
  });
});
