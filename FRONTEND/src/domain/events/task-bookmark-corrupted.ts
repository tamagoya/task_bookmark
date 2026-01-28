import { ValidationError } from '../value-objects/validation-error';

/**
 * TaskBookmarkCorrupted Domain Event
 * タスクブックマークのデータが破損していることが検出された時に発行されるイベント
 */
export class TaskBookmarkCorrupted {
  constructor(
    public readonly eventId: string,
    public readonly errors: ValidationError[],
    public readonly detectedAt: Date,
    public readonly canPartiallyLoad: boolean
  ) {}
}
