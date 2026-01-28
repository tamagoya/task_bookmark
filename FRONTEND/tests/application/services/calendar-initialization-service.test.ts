import { CalendarInitializationService } from '../../../src/application/services/calendar-initialization-service';
import { AuthRepository } from '../../../src/domain/repositories/auth-repository';
import { GoogleCalendarAdapter } from '../../../src/infrastructure/adapters/google-calendar-adapter';
import { AuthState } from '../../../src/domain/entities/auth-state';
import { AccessToken } from '../../../src/domain/value-objects/access-token';
import { RefreshToken } from '../../../src/domain/value-objects/refresh-token';
import { TokenExpiry } from '../../../src/domain/value-objects/token-expiry';
import { CalendarId } from '../../../src/domain/value-objects/calendar-id';

// モック
jest.mock('../../../src/infrastructure/adapters/google-calendar-adapter');

describe('CalendarInitializationService', () => {
  let service: CalendarInitializationService;
  let authRepository: jest.Mocked<AuthRepository>;
  let calendarAdapter: jest.Mocked<GoogleCalendarAdapter>;

  beforeEach(() => {
    authRepository = {
      findByUserId: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      getCurrent: jest.fn(),
    } as unknown as jest.Mocked<AuthRepository>;

    calendarAdapter = new GoogleCalendarAdapter() as jest.Mocked<GoogleCalendarAdapter>;
    service = new CalendarInitializationService(authRepository, calendarAdapter);
  });

  describe('ensureCalendarExists', () => {
    it('既にカレンダーIDが設定されている場合は、それを返す', async () => {
      const userId = 'user-123';
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      const calendarId = CalendarId.create('calendar-id-12345');
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      authState.initializeCalendar(calendarId);

      authRepository.getCurrent.mockResolvedValue(authState);

      const result = await service.ensureCalendarExists();

      expect(result).toEqual(calendarId);
      expect(calendarAdapter.findOrCreateCalendar).not.toHaveBeenCalled();
    });

    it('カレンダーIDが設定されていない場合は、カレンダーを作成する', async () => {
      const userId = 'user-123';
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      const calendarId = CalendarId.create('calendar-id-12345');
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);

      authRepository.getCurrent.mockResolvedValue(authState);
      calendarAdapter.findOrCreateCalendar.mockResolvedValue(calendarId);
      authRepository.save.mockResolvedValue();

      const result = await service.ensureCalendarExists();

      expect(result).toEqual(calendarId);
      expect(calendarAdapter.findOrCreateCalendar).toHaveBeenCalledWith(accessToken.value);
      expect(authRepository.save).toHaveBeenCalled();
    });

    it('未認証の場合はエラーを投げる', async () => {
      authRepository.getCurrent.mockResolvedValue(null);

      await expect(service.ensureCalendarExists()).rejects.toThrow('User is not authenticated');
    });

  });

  describe('getCalendarId', () => {
    it('カレンダーIDが設定されている場合は、それを返す', async () => {
      const userId = 'user-123';
      const accessToken = AccessToken.create('valid-access-token-12345');
      const refreshToken = RefreshToken.create('valid-refresh-token-12345');
      const tokenExpiry = TokenExpiry.create(new Date(Date.now() + 3600000));
      const calendarId = CalendarId.create('calendar-id-12345');
      
      const authState = AuthState.createUnauthenticated(userId);
      authState.authenticate(accessToken, refreshToken, tokenExpiry);
      authState.initializeCalendar(calendarId);

      authRepository.getCurrent.mockResolvedValue(authState);

      const result = await service.getCalendarId();

      expect(result).toEqual(calendarId);
    });

    it('カレンダーIDが設定されていない場合は、nullを返す', async () => {
      authRepository.getCurrent.mockResolvedValue(null);

      const result = await service.getCalendarId();

      expect(result).toBeNull();
    });
  });
});
