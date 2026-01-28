/**
 * TokenRefreshed Domain Event
 * トークンが更新された時に発行されるイベント
 */
export class TokenRefreshed {
  constructor(
    public readonly userId: string,
    public readonly refreshedAt: Date,
    public readonly newExpiry: Date
  ) {}
}
