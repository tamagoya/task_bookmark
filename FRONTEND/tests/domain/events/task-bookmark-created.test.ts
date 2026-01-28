import { TaskBookmarkCreated } from '../../../src/domain/events/task-bookmark-created';

describe('TaskBookmarkCreated', () => {
  it('イベントを作成できる', () => {
    const event = new TaskBookmarkCreated('event-id-12345', '仕事名', new Date());
    
    expect(event).toBeDefined();
    expect(event.eventId).toBe('event-id-12345');
    expect(event.title).toBe('仕事名');
    expect(event.createdAt).toBeInstanceOf(Date);
  });
});
