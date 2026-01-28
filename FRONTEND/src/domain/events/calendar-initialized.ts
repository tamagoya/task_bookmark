/**
 * CalendarInitialized Domain Event
 * カレンダーが初期化された時に発行されるイベント
 */
export class CalendarInitialized {
  constructor(
    public readonly userId: string,
    public readonly calendarId: string,
    public readonly initializedAt: Date
  ) {}
}
