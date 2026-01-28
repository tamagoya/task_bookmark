import { MetadataMigrationService } from '../../../src/application/services/metadata-migration-service';
import { Logger } from '../../../src/infrastructure/adapters/logger';
import { WorkState } from '../../../src/domain/entities/work-state';
import { EventId } from '../../../src/domain/value-objects/event-id';
import { EventTitle } from '../../../src/domain/value-objects/event-title';
import { WorkStateMetadata } from '../../../src/domain/value-objects/work-state-metadata';
import { SchemaVersion } from '../../../src/domain/value-objects/schema-version';
import { TabInfo } from '../../../src/domain/value-objects/tab-info';

// モック
jest.mock('../../../src/infrastructure/adapters/logger');

describe('MetadataMigrationService', () => {
  let service: MetadataMigrationService;
  let logger: jest.Mocked<Logger>;
  let eventId: EventId;
  let title: EventTitle;
  let tabs: TabInfo[];
  let version1_0_0: SchemaVersion;
  let metadata: WorkStateMetadata;
  let workState: WorkState;

  beforeEach(() => {
    eventId = EventId.create('event-id-12345');
    title = EventTitle.create('仕事名');
    tabs = [
      {
        url: 'https://example.com',
        title: 'Example Page',
        index: 0,
      },
    ];
    const startTime = new Date('2026-01-21T10:00:00Z');
    const endTime = new Date('2026-01-21T11:00:00Z');
    version1_0_0 = SchemaVersion.create(1, 0, 0);
    metadata = WorkStateMetadata.create(version1_0_0, tabs, startTime);
    workState = WorkState.create(eventId, title, null, startTime, endTime, metadata);
    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    service = new MetadataMigrationService(logger);
  });

  describe('migrateToLatestVersion', () => {
    it('同じバージョンの場合はそのまま返す', async () => {
      const result = await service.migrateToLatestVersion(workState);

      expect(result).toEqual(workState);
    });

    it('メタデータがない場合はそのまま返す', async () => {
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const workStateWithoutMetadata = WorkState.create(
        eventId,
        title,
        null,
        startTime,
        endTime,
        null
      );

      const result = await service.migrateToLatestVersion(workStateWithoutMetadata);

      expect(result).toEqual(workStateWithoutMetadata);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('validateAndRepair', () => {
    it('破損していない場合はそのまま返す', async () => {
      const result = await service.validateAndRepair(workState);

      expect(result).toEqual(workState);
    });

    it('部分的に読み込み可能な場合はそのまま返す', async () => {
      const startTime = new Date('2026-01-21T10:00:00Z');
      const endTime = new Date('2026-01-21T11:00:00Z');
      const corruptedWorkState = WorkState.create(
        eventId,
        title,
        null,
        startTime,
        endTime,
        null
      );
      const errors = [
        require('../../../src/domain/value-objects/validation-error').ValidationError.create(
          'description',
          'INVALID_JSON',
          'JSON形式が無効です',
          'CRITICAL',
          false
        ),
      ];
      corruptedWorkState.markAsCorrupted(errors);

      const result = await service.validateAndRepair(corruptedWorkState);

      expect(result).toEqual(corruptedWorkState);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
