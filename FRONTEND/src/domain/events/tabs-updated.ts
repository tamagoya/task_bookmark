import { TabInfo } from '../value-objects/tab-info';

/**
 * TabsUpdated Domain Event (Bolt 8: URL編集機能)
 * タブリストが更新された時に発行されるイベント
 */
export class TabsUpdated {
  constructor(
    public readonly eventId: string,
    public readonly updatedTabs: TabInfo[],
    public readonly operationType: 'update' | 'add' | 'remove' | 'reorder',
    public readonly operationDetails?: {
      fromIndex?: number;
      toIndex?: number;
      addedTab?: TabInfo;
      removedTabIndex?: number;
    },
    public readonly updatedAt: Date = new Date()
  ) {
    // ビジネスルール: updatedTabs配列は空であってはならない
    if (!updatedTabs || updatedTabs.length === 0) {
      throw new Error('Updated tabs array cannot be empty');
    }

    // ビジネスルール: eventIdは空文字列であってはならない
    if (!eventId || eventId.trim().length === 0) {
      throw new Error('Event ID cannot be empty');
    }

    // ビジネスルール: operationTypeは有効な値である必要がある
    const validOperationTypes: Array<'update' | 'add' | 'remove' | 'reorder'> = ['update', 'add', 'remove', 'reorder'];
    if (!validOperationTypes.includes(operationType)) {
      throw new Error(`Invalid operation type: ${operationType}`);
    }
  }

  /**
   * 更新されたタブの数
   */
  get tabCount(): number {
    return this.updatedTabs.length;
  }
}
