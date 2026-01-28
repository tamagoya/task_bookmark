/**
 * UserAuthenticated Domain Event
 * ユーザーが認証された時に発行されるイベント
 */
export class UserAuthenticated {
  constructor(
    public readonly userId: string,
    public readonly authenticatedAt: Date
  ) {}
}
