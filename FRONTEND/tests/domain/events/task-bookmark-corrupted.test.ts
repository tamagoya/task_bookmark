import { TaskBookmarkCorrupted } from '../../../src/domain/events/task-bookmark-corrupted';
import { ValidationError } from '../../../src/domain/value-objects/validation-error';

describe('TaskBookmarkCorrupted', () => {
  it('イベントを作成できる', () => {
    const errors = [
      ValidationError.create('description', 'INVALID_JSON', 'JSON形式が無効です', 'CRITICAL', false),
    ];
    const event = new TaskBookmarkCorrupted('event-id-12345', errors, new Date(), true);
    
    expect(event).toBeDefined();
    expect(event.eventId).toBe('event-id-12345');
    expect(event.errors).toEqual(errors);
    expect(event.detectedAt).toBeInstanceOf(Date);
    expect(event.canPartiallyLoad).toBe(true);
  });
});
