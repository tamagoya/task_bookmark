import { TaskBookmark } from '../../../src/domain/aggregates/task-bookmark';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { EventDescription } from '../../../src/domain/value-objects/event-description';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

describe('TaskBookmark', () => {
  const eventId = EventId.create('event-id-12345');
  const title = EventTitle.create('仕事名');
  const startTime = new Date('2026-01-21T10:00:00Z');
  const endTime = new Date('2026-01-21T11:00:00Z');
  const mockTabs: TabInfo[] = [
    {
      url: 'https://example.com',
      title: 'Example Page',
      index: 0,
    },
  ];
  const version = SchemaVersion.create(1, 0, 0);
  const metadata = WorkStateMetadata.create(version, mockTabs, new Date());
  const description = EventDescription.create(metadata);
  const workState = WorkState.create(eventId, title, description, startTime, endTime, metadata);

  describe('作成', () => {
    it('有効な仕事状態で作成できる', () => {
      const taskBookmark = TaskBookmark.create(workState);
      
      expect(taskBookmark).toBeDefined();
      expect(taskBookmark.workState).toEqual(workState);
    });
  });

  describe('updateWorkState', () => {
    it('仕事状態を更新できる（イミュータブル）', () => {
      const taskBookmark = TaskBookmark.create(workState);
      const newTitle = EventTitle.create('新しい仕事名');
      const newWorkState = WorkState.create(
        eventId,
        newTitle,
        description,
        startTime,
        endTime,
        metadata
      );
      
      const updatedTaskBookmark = taskBookmark.updateWorkState(newWorkState);
      
      expect(updatedTaskBookmark).not.toBe(taskBookmark);
      expect(updatedTaskBookmark.workState.title).toEqual(newTitle);
      expect(taskBookmark.workState.title).toEqual(title); // 元のインスタンスは変更されない
    });
  });
});
