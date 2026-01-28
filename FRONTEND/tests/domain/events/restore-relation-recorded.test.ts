import { RestoreRelationRecorded } from '../../../src/domain/events/restore-relation-recorded';

describe('RestoreRelationRecorded', () => {
  it('イベントを作成できる', () => {
    const event = new RestoreRelationRecorded('event-id-12345', 'event-id-67890', new Date());
    
    expect(event).toBeDefined();
    expect(event.fromEventId).toBe('event-id-12345');
    expect(event.toEventId).toBe('event-id-67890');
    expect(event.recordedAt).toBeInstanceOf(Date);
  });
});
