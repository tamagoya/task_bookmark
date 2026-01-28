/**
 * UserLoggedOut Domain Event
 * ユーザーがログアウトした時に発行されるイベント
 */
export class UserLoggedOut {
  constructor(
    public readonly userId: string,
    public readonly loggedOutAt: Date
  ) {}
}
