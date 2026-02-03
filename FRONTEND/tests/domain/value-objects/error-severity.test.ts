import { ErrorSeverity } from '../../../src/domain/value-objects/error-severity';

describe('ErrorSeverity', () => {
  describe('値の定義', () => {
    it('INFOが定義されている', () => {
      expect(ErrorSeverity.INFO).toBe('INFO');
    });

    it('WARNINGが定義されている', () => {
      expect(ErrorSeverity.WARNING).toBe('WARNING');
    });

    it('ERRORが定義されている', () => {
      expect(ErrorSeverity.ERROR).toBe('ERROR');
    });

    it('CRITICALが定義されている', () => {
      expect(ErrorSeverity.CRITICAL).toBe('CRITICAL');
    });
  });

  describe('isRecoverable', () => {
    it('INFOは回復可能', () => {
      expect(ErrorSeverity.isRecoverable(ErrorSeverity.INFO)).toBe(true);
    });

    it('WARNINGは回復可能', () => {
      expect(ErrorSeverity.isRecoverable(ErrorSeverity.WARNING)).toBe(true);
    });

    it('ERRORは回復可能', () => {
      expect(ErrorSeverity.isRecoverable(ErrorSeverity.ERROR)).toBe(true);
    });

    it('CRITICALは回復不可能', () => {
      expect(ErrorSeverity.isRecoverable(ErrorSeverity.CRITICAL)).toBe(false);
    });
  });

  describe('等価性', () => {
    it('同じ値の重要度は等しい', () => {
      expect(ErrorSeverity.INFO).toBe(ErrorSeverity.INFO);
    });

    it('異なる値の重要度は等しくない', () => {
      expect(ErrorSeverity.INFO).not.toBe(ErrorSeverity.ERROR);
    });
  });
});
