/**
 * TaskBookmarkCreated Domain Event
 * タスクブックマークが作成された時に発行されるイベント
 */
export class TaskBookmarkCreated {
  constructor(
    public readonly eventId: string,
    public readonly title: string,
    public readonly createdAt: Date
  ) {}
}
