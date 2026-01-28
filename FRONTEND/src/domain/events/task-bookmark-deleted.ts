/**
 * TaskBookmarkDeleted Domain Event
 * タスクブックマークが削除された時に発行されるイベント
 */
export class TaskBookmarkDeleted {
  constructor(
    public readonly eventId: string,
    public readonly deletedAt: Date
  ) {}
}
