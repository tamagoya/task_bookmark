/**
 * AuthenticationFailed Domain Event
 * 認証に失敗した時に発行されるイベント
 */
export class AuthenticationFailed {
  constructor(
    public readonly userId: string | undefined,
    public readonly errorCode: string,
    public readonly errorMessage: string,
    public readonly failedAt: Date
  ) {}
}
