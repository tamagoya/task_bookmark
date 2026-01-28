import { TaskBookmarkDeleted } from '../../../src/domain/events/task-bookmark-deleted';

describe('TaskBookmarkDeleted', () => {
  it('イベントを作成できる', () => {
    const event = new TaskBookmarkDeleted('event-id-12345', new Date());
    
    expect(event).toBeDefined();
    expect(event.eventId).toBe('event-id-12345');
    expect(event.deletedAt).toBeInstanceOf(Date);
  });
});
