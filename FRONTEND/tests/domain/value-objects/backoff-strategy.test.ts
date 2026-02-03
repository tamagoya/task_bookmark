import { BackoffStrategy } from '../../../src/domain/value-objects/backoff-strategy';

describe('BackoffStrategy', () => {
  describe('値の定義', () => {
    it('LINEARが定義されている', () => {
      expect(BackoffStrategy.LINEAR).toBe('LINEAR');
    });

    it('EXPONENTIALが定義されている', () => {
      expect(BackoffStrategy.EXPONENTIAL).toBe('EXPONENTIAL');
    });

    it('FIXEDが定義されている', () => {
      expect(BackoffStrategy.FIXED).toBe('FIXED');
    });
  });

  describe('等価性', () => {
    it('同じ値のバックオフ戦略は等しい', () => {
      expect(BackoffStrategy.LINEAR).toBe(BackoffStrategy.LINEAR);
    });

    it('異なる値のバックオフ戦略は等しくない', () => {
      expect(BackoffStrategy.LINEAR).not.toBe(BackoffStrategy.EXPONENTIAL);
    });
  });
});
