/**
 * TaskBookmarkUpdated Domain Event
 * タスクブックマークが更新された時に発行されるイベント
 */
export class TaskBookmarkUpdated {
  constructor(
    public readonly eventId: string,
    public readonly updatedFields: string[],
    public readonly updatedAt: Date
  ) {}
}
