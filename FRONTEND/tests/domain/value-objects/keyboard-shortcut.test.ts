import { KeyboardShortcut } from '../../../src/domain/value-objects/keyboard-shortcut';

describe('KeyboardShortcut', () => {
  describe('作成', () => {
    it('有効なキーとアクションで作成できる', () => {
      const key = 'Enter';
      const action = '保存';
      const keyboardShortcut = KeyboardShortcut.create(key, action);
      
      expect(keyboardShortcut).toBeDefined();
      expect(keyboardShortcut.key).toBe(key);
      expect(keyboardShortcut.action).toBe(action);
      expect(keyboardShortcut.description).toBeUndefined();
    });

    it('説明を含めて作成できる', () => {
      const key = 'Ctrl+S';
      const action = '保存';
      const description = '現在のタブ状態を保存します';
      const keyboardShortcut = KeyboardShortcut.create(key, action, description);
      
      expect(keyboardShortcut.key).toBe(key);
      expect(keyboardShortcut.action).toBe(action);
      expect(keyboardShortcut.description).toBe(description);
    });

    it('空のキーで作成しようとするとエラーを投げる', () => {
      expect(() => {
        KeyboardShortcut.create('', '保存');
      }).toThrow('KeyboardShortcut key cannot be empty');
    });

    it('空のアクションで作成しようとするとエラーを投げる', () => {
      expect(() => {
        KeyboardShortcut.create('Enter', '');
      }).toThrow('KeyboardShortcut action cannot be empty');
    });
  });

  describe('等価性', () => {
    it('同じキーとアクションのキーボードショートカットは等しい', () => {
      const keyboardShortcut1 = KeyboardShortcut.create('Enter', '保存');
      const keyboardShortcut2 = KeyboardShortcut.create('Enter', '保存');
      
      expect(keyboardShortcut1.equals(keyboardShortcut2)).toBe(true);
    });

    it('異なるキーのキーボードショートカットは等しくない', () => {
      const keyboardShortcut1 = KeyboardShortcut.create('Enter', '保存');
      const keyboardShortcut2 = KeyboardShortcut.create('Escape', '保存');
      
      expect(keyboardShortcut1.equals(keyboardShortcut2)).toBe(false);
    });

    it('異なるアクションのキーボードショートカットは等しくない', () => {
      const keyboardShortcut1 = KeyboardShortcut.create('Enter', '保存');
      const keyboardShortcut2 = KeyboardShortcut.create('Enter', 'キャンセル');
      
      expect(keyboardShortcut1.equals(keyboardShortcut2)).toBe(false);
    });
  });
});
