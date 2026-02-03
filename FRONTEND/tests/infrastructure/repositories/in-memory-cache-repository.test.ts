import { InMemoryCacheRepository } from '../../../src/infrastructure/repositories/in-memory-cache-repository';

describe('InMemoryCacheRepository', () => {
  let repository: InMemoryCacheRepository;

  beforeEach(() => {
    repository = new InMemoryCacheRepository(10);
  });

  describe('set and get', () => {
    it('should set and get value', async () => {
      await repository.set('key1', 'value1', 60);
      const entry = await repository.get<string>('key1');

      expect(entry).not.toBeNull();
      expect(entry?.value).toBe('value1');
    });

    it('should return null for non-existent key', async () => {
      const entry = await repository.get<string>('unknown');

      expect(entry).toBeNull();
    });

    it('should return null for expired entry', async () => {
      await repository.set('key1', 'value1', 0);

      // 少し待ってからTTLチェック
      await new Promise((resolve) => setTimeout(resolve, 10));

      const entry = await repository.get<string>('key1');

      expect(entry).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete entry', async () => {
      await repository.set('key1', 'value1', 60);
      await repository.delete('key1');

      const entry = await repository.get<string>('key1');

      expect(entry).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await repository.set('key1', 'value1', 60);
      await repository.set('key2', 'value2', 60);
      await repository.clear();

      const size = await repository.size();

      expect(size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return correct size', async () => {
      await repository.set('key1', 'value1', 60);
      await repository.set('key2', 'value2', 60);

      const size = await repository.size();

      expect(size).toBe(2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when max size is exceeded', async () => {
      const smallRepository = new InMemoryCacheRepository(3);

      await smallRepository.set('key1', 'value1', 60);
      await smallRepository.set('key2', 'value2', 60);
      await smallRepository.set('key3', 'value3', 60);
      await smallRepository.set('key4', 'value4', 60);

      const size = await smallRepository.size();
      const entry1 = await smallRepository.get<string>('key1');
      const entry4 = await smallRepository.get<string>('key4');

      expect(size).toBe(3);
      expect(entry1).toBeNull(); // Evicted
      expect(entry4?.value).toBe('value4'); // Still exists
    });
  });
});
