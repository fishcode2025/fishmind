import { SQLiteService } from '../SQLiteService';
import { createTables, dropTables } from '../schema';

// 模拟SQLiteService
jest.mock('../SQLiteService', () => {
  const executedQueries: string[] = [];
  
  class MockSQLiteService {
    async execute(sql: string): Promise<void> {
      executedQueries.push(sql.trim());
    }
    
    async transaction(callback: () => Promise<any>): Promise<any> {
      return callback();
    }
    
    async query<T>(sql: string): Promise<T[]> {
      if (sql.includes('sqlite_master')) {
        return [
          { name: 'config' },
          { name: 'topics' },
          { name: 'messages' },
          { name: 'providers' },
          { name: 'models' },
          { name: 'default_models' },
          { name: 'encryption_keys' }
        ] as unknown as T[];
      }
      return [] as unknown as T[];
    }
    
    static getExecutedQueries(): string[] {
      return executedQueries;
    }
    
    static clearExecutedQueries(): void {
      executedQueries.length = 0;
    }
  }
  
  return {
    SQLiteService: MockSQLiteService
  };
});

describe('数据库表结构测试', () => {
  let db: any;
  
  beforeEach(() => {
    db = new SQLiteService();
    (SQLiteService as any).clearExecutedQueries();
  });
  
  it('应该创建所有必需的表', async () => {
    await createTables(db);
    
    const queries = (SQLiteService as any).getExecutedQueries();
    
    // 验证创建了所有必需的表
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS config'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS topics'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS messages'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS providers'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS models'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS default_models'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE TABLE IF NOT EXISTS encryption_keys'))).toBe(true);
  });
  
  it('应该创建所有必需的索引', async () => {
    await createTables(db);
    
    const queries = (SQLiteService as any).getExecutedQueries();
    
    // 验证创建了所有必需的索引
    expect(queries.some((q: string) => q.includes('CREATE INDEX IF NOT EXISTS idx_messages_topic_id'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE INDEX IF NOT EXISTS idx_messages_timestamp'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE INDEX IF NOT EXISTS idx_models_provider_id'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE INDEX IF NOT EXISTS idx_models_group_id'))).toBe(true);
    expect(queries.some((q: string) => q.includes('CREATE INDEX IF NOT EXISTS idx_encryption_keys_topic_id'))).toBe(true);
  });
  
  it('应该删除所有表', async () => {
    await dropTables(db);
    
    const queries = (SQLiteService as any).getExecutedQueries();
    
    // 验证删除了所有表
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS encryption_keys'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS default_models'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS models'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS providers'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS messages'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS topics'))).toBe(true);
    expect(queries.some((q: string) => q.includes('DROP TABLE IF EXISTS config'))).toBe(true);
  });
}); 