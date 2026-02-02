import { CalendarEventRepository } from '../../domain/repositories/calendar-event-repository';
import { EventId } from '../../domain/value-objects/event-id';
import { CalendarId } from '../../domain/value-objects/calendar-id';
import { AccessToken } from '../../domain/value-objects/access-token';
import { RestoreRelation } from '../../domain/value-objects/restore-relation';
import { Logger } from '../../infrastructure/adapters/logger';

/**
 * RestoreRelations
 * 前後関係を表すインターフェース
 */
export interface RestoreRelations {
  restoredFrom: RestoreRelation | null;
  restoredTo: RestoreRelation[];
}

/**
 * RestoreRelationService
 * 前後関係データの取得と構築を担当するアプリケーションサービス
 */
export class RestoreRelationService {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 指定されたイベントIDの前後関係を取得
   * @param eventId イベントID
   * @param calendarId カレンダーID
   * @param accessToken アクセストークン
   * @returns 前後関係データ
   */
  async getRestoreRelations(
    eventId: EventId,
    calendarId: CalendarId,
    accessToken: AccessToken
  ): Promise<RestoreRelations> {
    // 現在のWorkStateを取得
    const currentWorkState = await this.calendarEventRepository.findById(
      eventId,
      calendarId,
      accessToken
    );

    if (!currentWorkState) {
      throw new Error(`WorkState not found: ${eventId.value}`);
    }

    // 復元元を取得
    let restoredFrom: RestoreRelation | null = null;
    if (currentWorkState.metadata?.restoredFrom) {
      try {
        const restoredFromEventId = EventId.create(currentWorkState.metadata.restoredFrom);
        const restoredFromWorkState = await this.calendarEventRepository.findById(
          restoredFromEventId,
          calendarId,
          accessToken
        );

        if (restoredFromWorkState) {
          restoredFrom = RestoreRelation.create({
            eventId: restoredFromWorkState.eventId.value,
            title: restoredFromWorkState.title.value,
            savedAt: restoredFromWorkState.metadata?.savedAt || new Date().toISOString(),
          });
        } else {
          this.logger.warn(`RestoredFrom WorkState not found: ${currentWorkState.metadata.restoredFrom}`);
        }
      } catch (error) {
        this.logger.error(`Failed to get restoredFrom: ${error}`);
      }
    }

    // 復元先を取得
    const restoredTo: RestoreRelation[] = [];
    if (currentWorkState.metadata?.restoredTo && currentWorkState.metadata.restoredTo.length > 0) {
      for (const restoredToEntry of currentWorkState.metadata.restoredTo) {
        try {
          const restoredToEventId = EventId.create(restoredToEntry.eventId);
          const restoredToWorkState = await this.calendarEventRepository.findById(
            restoredToEventId,
            calendarId,
            accessToken
          );

          if (restoredToWorkState) {
            restoredTo.push(
              RestoreRelation.create({
                eventId: restoredToWorkState.eventId.value,
                title: restoredToWorkState.title.value,
                savedAt: restoredToWorkState.metadata?.savedAt || new Date().toISOString(),
                restoredAt: restoredToEntry.restoredAt,
              })
            );
          } else {
            this.logger.warn(`RestoredTo WorkState not found: ${restoredToEntry.eventId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to get restoredTo: ${error}`);
        }
      }
    }

    return {
      restoredFrom,
      restoredTo,
    };
  }
}
