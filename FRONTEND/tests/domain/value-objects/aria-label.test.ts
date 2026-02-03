import { AriaLabel } from '../../../src/domain/value-objects/aria-label';

describe('AriaLabel', () => {
  describe('作成', () => {
    it('有効なラベルで作成できる', () => {
      const label = '保存ボタン';
      const ariaLabel = AriaLabel.create(label);
      
      expect(ariaLabel).toBeDefined();
      expect(ariaLabel.label).toBe(label);
      expect(ariaLabel.description).toBeUndefined();
    });

    it('説明を含めて作成できる', () => {
      const label = '保存ボタン';
      const description = '現在のタブ状態を保存します';
      const ariaLabel = AriaLabel.create(label, description);
      
      expect(ariaLabel.label).toBe(label);
      expect(ariaLabel.description).toBe(description);
    });

    it('空文字列で作成しようとするとエラーを投げる', () => {
      expect(() => {
        AriaLabel.create('');
      }).toThrow('AriaLabel label cannot be empty');
    });
  });

  describe('等価性', () => {
    it('同じラベルのARIAラベルは等しい', () => {
      const ariaLabel1 = AriaLabel.create('保存ボタン');
      const ariaLabel2 = AriaLabel.create('保存ボタン');
      
      expect(ariaLabel1.equals(ariaLabel2)).toBe(true);
    });

    it('異なるラベルのARIAラベルは等しくない', () => {
      const ariaLabel1 = AriaLabel.create('保存ボタン');
      const ariaLabel2 = AriaLabel.create('キャンセルボタン');
      
      expect(ariaLabel1.equals(ariaLabel2)).toBe(false);
    });
  });
});
