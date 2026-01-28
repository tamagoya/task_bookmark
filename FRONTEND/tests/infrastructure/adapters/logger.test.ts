import { Logger } from '../../../src/infrastructure/adapters/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    jest.clearAllMocks();
  });

  describe('error', () => {
    it('エラーログを記録できる', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');

      logger.error('Test error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', error);
      
      consoleErrorSpy.mockRestore();
    });

    it('エラーオブジェクトがない場合でもログを記録できる', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', undefined);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('warn', () => {
    it('警告ログを記録できる', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message');
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('info', () => {
    it('情報ログを記録できる', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.info('Test info message');

      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Test info message');
      
      consoleInfoSpy.mockRestore();
    });
  });

  describe('performance', () => {
    it('パフォーマンスログを記録できる', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.performance('test-operation', 123);

      expect(consoleInfoSpy).toHaveBeenCalledWith('[PERF] test-operation: 123ms');
      
      consoleInfoSpy.mockRestore();
    });
  });
});
