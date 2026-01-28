import { ValidationError } from '../../../src/domain/value-objects/validation-error';

describe('ValidationError', () => {
  describe('作成', () => {
    it('有効なエラー情報で作成できる', () => {
      const error = ValidationError.create(
        'description',
        'INVALID_JSON',
        'JSON形式が無効です',
        'CRITICAL',
        false
      );
      
      expect(error).toBeDefined();
      expect(error.field).toBe('description');
      expect(error.errorCode).toBe('INVALID_JSON');
      expect(error.errorMessage).toBe('JSON形式が無効です');
      expect(error.severity).toBe('CRITICAL');
      expect(error.recoverable).toBe(false);
    });

    it('空のフィールド名で作成しようとするとエラーを投げる', () => {
      expect(() => {
        ValidationError.create('', 'INVALID_JSON', 'エラーメッセージ', 'CRITICAL', false);
      }).toThrow('ValidationError field cannot be empty');
    });

    it('空のエラーコードで作成しようとするとエラーを投げる', () => {
      expect(() => {
        ValidationError.create('description', '', 'エラーメッセージ', 'CRITICAL', false);
      }).toThrow('ValidationError errorCode cannot be empty');
    });

    it('空のエラーメッセージで作成しようとするとエラーを投げる', () => {
      expect(() => {
        ValidationError.create('description', 'INVALID_JSON', '', 'CRITICAL', false);
      }).toThrow('ValidationError errorMessage cannot be empty');
    });
  });

  describe('等価性', () => {
    it('同じ値のエラーは等しい', () => {
      const error1 = ValidationError.create(
        'description',
        'INVALID_JSON',
        'JSON形式が無効です',
        'CRITICAL',
        false
      );
      const error2 = ValidationError.create(
        'description',
        'INVALID_JSON',
        'JSON形式が無効です',
        'CRITICAL',
        false
      );
      
      expect(error1.equals(error2)).toBe(true);
    });

    it('異なる値のエラーは等しくない', () => {
      const error1 = ValidationError.create(
        'description',
        'INVALID_JSON',
        'JSON形式が無効です',
        'CRITICAL',
        false
      );
      const error2 = ValidationError.create(
        'description',
        'MISSING_FIELD',
        '必須フィールドが欠落しています',
        'WARNING',
        true
      );
      
      expect(error1.equals(error2)).toBe(false);
    });
  });
});
