/**
 * RestoreRelationRecorded Domain Event
 * 復元関係が記録された時に発行されるイベント
 */
export class RestoreRelationRecorded {
  constructor(
    public readonly fromEventId: string,
    public readonly toEventId: string,
    public readonly recordedAt: Date
  ) {}
}
