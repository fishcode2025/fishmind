# 阶段一：基础设施搭建详细实施计划

本文档详细描述了数据库与服务层重构的第一阶段实施计划，包括具体的代码示例、测试方法和验证标准。

## 1. 创建目录结构

### 任务描述
创建新的目录结构，为重构做准备。

### 具体步骤
1. 创建`src/services/database`目录
2. 创建`src/repositories`目录
3. 创建`src/models`目录

### 验证方法
- **目录结构检查**：确认所有目录已创建
- **代码审查**：确保目录结构符合设计规范

### 完成标准
- 所有目录已创建
- 目录结构符合项目规范

## 2. 实现数据库服务接口

### 任务描述
定义数据库服务接口，为不同的数据库实现提供统一的抽象。

### 具体步骤
1. 创建`src/services/database/interfaces.ts`文件
2. 定义`IDatabaseService`接口

### 代码示例
```typescript
// src/services/database/interfaces.ts
export interface IDatabaseService {
  // 数据库初始化和管理
  initialize(): Promise<void>;
  close(): Promise<void>;
  backup(targetPath: string): Promise<void>;
  restore(sourcePath: string): Promise<void>;
  changeLocation(newLocation: string): Promise<void>;
  getLocation(): Promise<string>;
  
  // 事务支持
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  
  // 查询方法
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  get<T>(sql: string, params?: any[]): Promise<T | null>;
}

// 数据库错误类型
export enum DatabaseErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  MIGRATION_ERROR = 'MIGRATION_ERROR',
  BACKUP_ERROR = 'BACKUP_ERROR',
  RESTORE_ERROR = 'RESTORE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 数据库错误类
export class DatabaseError extends Error {
  type: DatabaseErrorType;
  
  constructor(message: string, type: DatabaseErrorType = DatabaseErrorType.UNKNOWN_ERROR) {
    super(message);
    this.type = type;
    this.name = 'DatabaseError';
  }
}
```

### 测试方法
```typescript
// src/services/database/__tests__/interfaces.test.ts
import { IDatabaseService, DatabaseError, DatabaseErrorType } from '../interfaces';

describe('Database Interfaces', () => {
  it('should define all required methods in IDatabaseService', () => {
    // 创建一个模拟实现，检查是否包含所有必需的方法
    const mockImplementation: IDatabaseService = {
      initialize: jest.fn(),
      close: jest.fn(),
      backup: jest.fn(),
      restore: jest.fn(),
      changeLocation: jest.fn(),
      getLocation: jest.fn(),
      transaction: jest.fn(),
      query: jest.fn(),
      execute: jest.fn(),
      get: jest.fn()
    };
    
    // 验证接口定义的完整性
    expect(mockImplementation).toBeDefined();
    expect(typeof mockImplementation.initialize).toBe('function');
    expect(typeof mockImplementation.close).toBe('function');
    expect(typeof mockImplementation.backup).toBe('function');
    expect(typeof mockImplementation.restore).toBe('function');
    expect(typeof mockImplementation.changeLocation).toBe('function');
    expect(typeof mockImplementation.getLocation).toBe('function');
    expect(typeof mockImplementation.transaction).toBe('function');
    expect(typeof mockImplementation.query).toBe('function');
    expect(typeof mockImplementation.execute).toBe('function');
    expect(typeof mockImplementation.get).toBe('function');
  });
  
  it('should create DatabaseError with correct type', () => {
    const error = new DatabaseError('Test error', DatabaseErrorType.CONNECTION_ERROR);
    expect(error.message).toBe('Test error');
    expect(error.type).toBe(DatabaseErrorType.CONNECTION_ERROR);
    expect(error.name).toBe('DatabaseError');
  });
  
  it('should use UNKNOWN_ERROR as default type', () => {
    const error = new DatabaseError('Test error');
    expect(error.type).toBe(DatabaseErrorType.UNKNOWN_ERROR);
  });
});
```

### 验证方法
- **代码审查**：确保接口设计符合需求
- **单元测试**：测试接口定义的完整性

### 完成标准
- 接口定义完整，包含所有必需的方法
- 单元测试通过，覆盖率100%

## 3. 实现SQLite数据库服务

### 任务描述
实现SQLite数据库服务，提供数据库连接、初始化和基本操作功能。

### 具体步骤
1. 创建`src/services/database/SQLiteService.ts`文件
2. 实现`IDatabaseService`接口
3. 使用Tauri的SQLite插件实现数据库操作

### 代码示例
```typescript
// src/services/database/SQLiteService.ts
import { Database } from '@tauri-apps/plugin-sql';
import { exists, createDir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { IDatabaseService, DatabaseError, DatabaseErrorType } from './interfaces';
import { appConfigDir } from '@tauri-apps/api/path';

export class SQLiteService implements IDatabaseService {
  private db: Database | null = null;
  private dbPath: string = '';
  
  constructor() {}
  
  async initialize(dbPath?: string): Promise<void> {
    try {
      // 如果没有提供路径，使用默认路径
      if (!dbPath) {
        const appDir = await appConfigDir();
        const dataDir = `${appDir}data/db`;
        
        // 确保目录存在
        if (!await exists(dataDir)) {
          await createDir(dataDir, { recursive: true });
        }
        
        dbPath = `${dataDir}/fishmind.db`;
      }
      
      this.dbPath = dbPath;
      
      // 连接数据库
      this.db = await Database.load(`sqlite:${dbPath}`);
      
      // 初始化数据库结构
      await this.initializeSchema();
      
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.CONNECTION_ERROR
      );
    }
  }
  
  async close(): Promise<void> {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
      } catch (error) {
        throw new DatabaseError(
          `Failed to close database: ${error instanceof Error ? error.message : String(error)}`,
          DatabaseErrorType.CONNECTION_ERROR
        );
      }
    }
  }
  
  async backup(targetPath: string): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', DatabaseErrorType.CONNECTION_ERROR);
    }
    
    try {
      // 执行VACUUM INTO命令进行备份
      await this.execute(`VACUUM INTO '${targetPath}'`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to backup database: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.BACKUP_ERROR
      );
    }
  }
  
  async restore(sourcePath: string): Promise<void> {
    try {
      // 关闭当前数据库连接
      await this.close();
      
      // 使用文件系统API复制文件
      const sourceContent = await readTextFile(sourcePath);
      await writeTextFile(this.dbPath, sourceContent);
      
      // 重新初始化数据库
      await this.initialize(this.dbPath);
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore database: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.RESTORE_ERROR
      );
    }
  }
  
  async changeLocation(newLocation: string): Promise<void> {
    try {
      // 备份当前数据库
      await this.backup(newLocation);
      
      // 关闭当前连接
      await this.close();
      
      // 使用新位置初始化
      await this.initialize(newLocation);
    } catch (error) {
      throw new DatabaseError(
        `Failed to change database location: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.MIGRATION_ERROR
      );
    }
  }
  
  async getLocation(): Promise<string> {
    return this.dbPath;
  }
  
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', DatabaseErrorType.CONNECTION_ERROR);
    }
    
    try {
      await this.execute('BEGIN TRANSACTION');
      
      try {
        const result = await callback();
        await this.execute('COMMIT');
        return result;
      } catch (error) {
        await this.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      throw new DatabaseError(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.TRANSACTION_ERROR
      );
    }
  }
  
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', DatabaseErrorType.CONNECTION_ERROR);
    }
    
    try {
      const result = await this.db.select<T>(sql, params);
      return result;
    } catch (error) {
      throw new DatabaseError(
        `Query failed: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async execute(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', DatabaseErrorType.CONNECTION_ERROR);
    }
    
    try {
      await this.db.execute(sql, params);
    } catch (error) {
      throw new DatabaseError(
        `Execute failed: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async get<T>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }
  
  private async initializeSchema(): Promise<void> {
    // 导入并执行数据库初始化脚本
    const { createTables } from './schema';
    await createTables(this);
  }
}
```

### 测试方法
```typescript
// src/services/database/__tests__/SQLiteService.test.ts
import { SQLiteService } from '../SQLiteService';
import { DatabaseError, DatabaseErrorType } from '../interfaces';
import { exists, removeFile } from '@tauri-apps/plugin-fs';

describe('SQLiteService', () => {
  let db: SQLiteService;
  const testDbPath = ':memory:'; // 使用内存数据库进行测试
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(testDbPath);
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should initialize database', async () => {
    expect(db).toBeDefined();
    
    // 验证数据库位置
    const location = await db.getLocation();
    expect(location).toBe(testDbPath);
    
    // 验证表结构
    const tables = await db.query<{name: string}>('SELECT name FROM sqlite_master WHERE type="table"');
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.map(t => t.name)).toContain('topics');
    expect(tables.map(t => t.name)).toContain('messages');
  });
  
  it('should perform basic CRUD operations', async () => {
    // 插入测试
    await db.execute(
      'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)',
      ['test_key', 'test_value', new Date().toISOString()]
    );
    
    // 查询测试
    const result = await db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['test_key']
    );
    expect(result).not.toBeNull();
    expect(result?.value).toBe('test_value');
    
    // 更新测试
    await db.execute(
      'UPDATE config SET value = ? WHERE key = ?',
      ['updated_value', 'test_key']
    );
    const updated = await db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['test_key']
    );
    expect(updated?.value).toBe('updated_value');
    
    // 删除测试
    await db.execute('DELETE FROM config WHERE key = ?', ['test_key']);
    const deleted = await db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['test_key']
    );
    expect(deleted).toBeNull();
  });
  
  it('should handle transactions', async () => {
    // 测试成功的事务
    await db.transaction(async () => {
      await db.execute(
        'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)',
        ['tx_key', 'tx_value', new Date().toISOString()]
      );
      return true;
    });
    
    const result = await db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['tx_key']
    );
    expect(result?.value).toBe('tx_value');
    
    // 测试失败的事务
    try {
      await db.transaction(async () => {
        await db.execute(
          'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)',
          ['tx_key2', 'tx_value2', new Date().toISOString()]
        );
        throw new Error('Transaction should rollback');
      });
      fail('Transaction should have failed');
    } catch (error) {
      // 事务应该回滚
      const result = await db.get<{value: string}>(
        'SELECT value FROM config WHERE key = ?',
        ['tx_key2']
      );
      expect(result).toBeNull();
    }
  });
  
  it('should handle backup and restore', async () => {
    // 准备测试数据
    await db.execute(
      'INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)',
      ['backup_key', 'backup_value', new Date().toISOString()]
    );
    
    // 创建临时备份文件
    const backupPath = './test_backup.db';
    
    // 执行备份
    await db.backup(backupPath);
    
    // 验证备份文件存在
    expect(await exists(backupPath)).toBe(true);
    
    // 修改原始数据
    await db.execute(
      'UPDATE config SET value = ? WHERE key = ?',
      ['modified_value', 'backup_key']
    );
    
    // 从备份恢复
    await db.restore(backupPath);
    
    // 验证数据已恢复
    const result = await db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['backup_key']
    );
    expect(result?.value).toBe('backup_value');
    
    // 清理测试文件
    await removeFile(backupPath);
  });
  
  it('should handle errors correctly', async () => {
    // 测试无效的SQL语句
    try {
      await db.query('SELECT * FROM non_existent_table');
      fail('Should throw an error for invalid table');
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      expect((error as DatabaseError).type).toBe(DatabaseErrorType.QUERY_ERROR);
    }
    
    // 测试未初始化的数据库
    const uninitializedDb = new SQLiteService();
    try {
      await uninitializedDb.query('SELECT 1');
      fail('Should throw an error for uninitialized database');
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      expect((error as DatabaseError).type).toBe(DatabaseErrorType.CONNECTION_ERROR);
    }
  });
});
```

### 验证方法
- **单元测试**：测试数据库连接和基本CRUD操作
- **集成测试**：验证数据库文件是否正确创建
- **手动验证**：使用SQLite浏览器查看数据库结构

### 完成标准
- SQLiteService实现了IDatabaseService接口的所有方法
- 单元测试通过，覆盖率不低于90%
- 数据库文件能够正确创建和初始化

## 4. 实现数据库初始化脚本

### 任务描述
实现数据库表结构定义和索引创建脚本。

### 具体步骤
1. 创建`src/services/database/schema.ts`文件
2. 实现表结构定义和索引创建函数

### 代码示例
```typescript
// src/services/database/schema.ts
import { IDatabaseService } from './interfaces';

export async function createTables(db: IDatabaseService): Promise<void> {
  await db.transaction(async () => {
    // 配置表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // 聊天话题表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_model_id TEXT,
        last_provider_id TEXT,
        message_count INTEGER DEFAULT 0,
        preview TEXT
      )
    `);
    
    // 聊天消息表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        topic_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        model_id TEXT,
        provider_id TEXT,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `);
    
    // 模型提供商表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        api_key TEXT,
        api_url TEXT NOT NULL,
        config TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    
    // 模型表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        config TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
      )
    `);
    
    // 默认模型表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS default_models (
        type TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
      )
    `);
    
    // 加密密钥表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS encryption_keys (
        id TEXT PRIMARY KEY,
        topic_id TEXT UNIQUE,
        algorithm TEXT NOT NULL,
        key_data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
      )
    `);
    
    // 创建索引
    await createIndexes(db);
  });
}

export async function createIndexes(db: IDatabaseService): Promise<void> {
  // 消息索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_topic_id 
    ON messages(topic_id)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
    ON messages(timestamp)
  `);
  
  // 模型索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_models_provider_id 
    ON models(provider_id)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_models_group_id 
    ON models(group_id)
  `);
  
  // 加密密钥索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_encryption_keys_topic_id 
    ON encryption_keys(topic_id)
  `);
}

export async function dropTables(db: IDatabaseService): Promise<void> {
  await db.transaction(async () => {
    // 按照依赖关系的反序删除表
    await db.execute('DROP TABLE IF EXISTS encryption_keys');
    await db.execute('DROP TABLE IF EXISTS default_models');
    await db.execute('DROP TABLE IF EXISTS models');
    await db.execute('DROP TABLE IF EXISTS providers');
    await db.execute('DROP TABLE IF EXISTS messages');
    await db.execute('DROP TABLE IF EXISTS topics');
    await db.execute('DROP TABLE IF EXISTS config');
  });
}
```

### 测试方法
```typescript
// src/services/database/__tests__/schema.test.ts
import { SQLiteService } from '../SQLiteService';
import { createTables, dropTables } from '../schema';

describe('Database Schema', () => {
  let db: SQLiteService;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should create all required tables', async () => {
    // 删除所有表，然后重新创建
    await dropTables(db);
    await createTables(db);
    
    // 验证所有表都已创建
    const tables = await db.query<{name: string}>(
      'SELECT name FROM sqlite_master WHERE type="table"'
    );
    
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('config');
    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('providers');
    expect(tableNames).toContain('models');
    expect(tableNames).toContain('default_models');
    expect(tableNames).toContain('encryption_keys');
  });
  
  it('should create all required indexes', async () => {
    // 验证所有索引都已创建
    const indexes = await db.query<{name: string}>(
      'SELECT name FROM sqlite_master WHERE type="index" AND name NOT LIKE "sqlite_%"'
    );
    
    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain('idx_messages_topic_id');
    expect(indexNames).toContain('idx_messages_timestamp');
    expect(indexNames).toContain('idx_models_provider_id');
    expect(indexNames).toContain('idx_models_group_id');
    expect(indexNames).toContain('idx_encryption_keys_topic_id');
  });
  
  it('should enforce foreign key constraints', async () => {
    // 创建测试数据
    await db.execute(`
      INSERT INTO topics (id, title, created_at, updated_at, message_count, preview)
      VALUES ('test-topic', 'Test Topic', '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z', 0, '')
    `);
    
    // 测试有效的外键
    await db.execute(`
      INSERT INTO messages (id, topic_id, role, content, timestamp)
      VALUES ('test-message', 'test-topic', 'user', 'Hello', '2023-01-01T00:00:00Z')
    `);
    
    // 验证消息已插入
    const message = await db.get<{id: string}>(
      'SELECT id FROM messages WHERE id = ?',
      ['test-message']
    );
    expect(message).not.toBeNull();
    
    // 测试无效的外键
    try {
      await db.execute(`
        INSERT INTO messages (id, topic_id, role, content, timestamp)
        VALUES ('invalid-message', 'non-existent-topic', 'user', 'Hello', '2023-01-01T00:00:00Z')
      `);
      fail('Should throw an error for invalid foreign key');
    } catch (error) {
      // 应该抛出外键约束错误
      expect(error).toBeDefined();
    }
    
    // 测试级联删除
    await db.execute('DELETE FROM topics WHERE id = ?', ['test-topic']);
    
    // 验证相关消息已删除
    const deletedMessage = await db.get<{id: string}>(
      'SELECT id FROM messages WHERE id = ?',
      ['test-message']
    );
    expect(deletedMessage).toBeNull();
  });
});
```

### 验证方法
- **单元测试**：验证表结构创建是否成功
- **数据库检查**：确认所有表和索引已正确创建

### 完成标准
- 所有表和索引都能正确创建
- 外键约束正常工作
- 单元测试通过，覆盖率不低于90%

## 总结

阶段一的实施计划详细描述了基础设施搭建的具体步骤、代码示例和验证方法。通过完成这些任务，我们将建立统一的数据库服务和目录结构，为后续的重构工作奠定基础。每个任务都有明确的验证方法和完成标准，确保重构过程可控且高质量。 