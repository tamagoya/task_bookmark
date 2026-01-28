import { TaskBookmarkUpdated } from '../../../src/domain/events/task-bookmark-updated';

describe('TaskBookmarkUpdated', () => {
  it('イベントを作成できる', () => {
    const event = new TaskBookmarkUpdated('event-id-12345', ['title', 'metadata'], new Date());
    
    expect(event).toBeDefined();
    expect(event.eventId).toBe('event-id-12345');
    expect(event.updatedFields).toEqual(['title', 'metadata']);
    expect(event.updatedAt).toBeInstanceOf(Date);
  });
});
