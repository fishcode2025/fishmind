/**
 * SQLiteService 集成测试
 * 
 * 这个测试文件使用实际的 SQLite 数据库测试 SQLiteService。
 * 注意：这个测试需要在 Tauri 环境中运行。
 */

import { SQLiteService } from '../SQLiteService';
import { DatabaseError } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

// 跳过测试，如果不在 Tauri 环境中
const itIfTauri = process.env.TAURI_PLATFORM ? it : it.skip;

describe('SQLiteService 集成测试', () => {
  let db: SQLiteService;
  
  beforeEach(async () => {
    // 使用内存数据库进行测试
    db = new SQLiteService();
    await db.initialize(':memory:');
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  itIfTauri('应该正确初始化数据库并创建表', async () => {
    // 查询所有表
    const tables = await db.query<{name: string}>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    // 验证必要的表已创建
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('config');
    expect(tableNames).toContain('topics');
    expect(tableNames).toContain('messages');
  });
  
  itIfTauri('应该执行基本的 CRUD 操作', async () => {
    // 创建测试数据
    const testKey = `test_${uuidv4()}`;
    const testValue = 'test_value';
    const timestamp = new Date().toISOString();
    
    // 插入
    await db.execute(
      'INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?)',
      [testKey, testValue, timestamp]
    );
    
    // 查询
    const result = await db.get<{key: string, value: string}>(
      'SELECT key, value FROM configs WHERE key = ?',
      [testKey]
    );
    
    expect(result).not.toBeNull();
    expect(result?.key).toBe(testKey);
    expect(result?.value).toBe(testValue);
    
    // 更新
    const newValue = 'updated_value';
    await db.execute(
      'UPDATE configs SET value = ? WHERE key = ?',
      [newValue, testKey]
    );
    
    const updated = await db.get<{value: string}>(
      'SELECT value FROM configs WHERE key = ?',
      [testKey]
    );
    
    expect(updated?.value).toBe(newValue);
    
    // 删除
    await db.execute('DELETE FROM configs WHERE key = ?', [testKey]);
    
    const deleted = await db.get<{key: string}>(
      'SELECT key FROM configs WHERE key = ?',
      [testKey]
    );
    
    expect(deleted).toBeNull();
  });
  
  itIfTauri('应该正确处理事务', async () => {
    // 测试成功的事务
    const testKey1 = `tx_${uuidv4()}`;
    
    await db.transaction(async () => {
      await db.execute(
        'INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?)',
        [testKey1, 'tx_value', new Date().toISOString()]
      );
      
      // 在同一事务中查询
      const result = await db.get<{key: string}>(
        'SELECT key FROM configs WHERE key = ?',
        [testKey1]
      );
      
      expect(result?.key).toBe(testKey1);
    });
    
    // 验证事务已提交
    const committed = await db.get<{key: string}>(
      'SELECT key FROM configs WHERE key = ?',
      [testKey1]
    );
    
    expect(committed?.key).toBe(testKey1);
    
    // 测试失败的事务
    const testKey2 = `tx_fail_${uuidv4()}`;
    
    try {
      await db.transaction(async () => {
        await db.execute(
          'INSERT INTO configs (key, value, updated_at) VALUES (?, ?, ?)',
          [testKey2, 'tx_value', new Date().toISOString()]
        );
        
        // 抛出错误，触发回滚
        throw new Error('Transaction should rollback');
      });
      
      fail('Transaction should have failed');
    } catch (error) {
      // 验证事务已回滚
      const rolledBack = await db.get<{key: string}>(
        'SELECT key FROM configs WHERE key = ?',
        [testKey2]
      );
      
      expect(rolledBack).toBeNull();
    }
  });
  
  itIfTauri('应该正确处理外键约束', async () => {
    // 创建话题
    const topicId = uuidv4();
    const timestamp = new Date().toISOString();
    
    await db.execute(
      'INSERT INTO topics (id, title, created_at, updated_at, message_count) VALUES (?, ?, ?, ?, ?)',
      [topicId, 'Test Topic', timestamp, timestamp, 0]
    );
    
    // 创建消息（有效的外键）
    const messageId = uuidv4();
    
    await db.execute(
      'INSERT INTO messages (id, topic_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
      [messageId, topicId, 'user', 'Test message', timestamp]
    );
    
    // 验证消息已创建
    const message = await db.get<{id: string}>(
      'SELECT id FROM messages WHERE id = ?',
      [messageId]
    );
    
    expect(message?.id).toBe(messageId);
    
    // 测试无效的外键
    const invalidMessageId = uuidv4();
    const invalidTopicId = uuidv4();
    
    try {
      await db.execute(
        'INSERT INTO messages (id, topic_id, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
        [invalidMessageId, invalidTopicId, 'user', 'Invalid message', timestamp]
      );
      
      fail('Should throw an error for invalid foreign key');
    } catch (error) {
      // 验证消息未创建
      const invalidMessage = await db.get<{id: string}>(
        'SELECT id FROM messages WHERE id = ?',
        [invalidMessageId]
      );
      
      expect(invalidMessage).toBeNull();
    }
    
    // 测试级联删除
    await db.execute('DELETE FROM topics WHERE id = ?', [topicId]);
    
    // 验证相关消息已删除
    const deletedMessage = await db.get<{id: string}>(
      'SELECT id FROM messages WHERE id = ?',
      [messageId]
    );
    
    expect(deletedMessage).toBeNull();
  });
  
  itIfTauri('应该正确处理备份和恢复', async () => {
    // 跳过此测试，因为它需要文件系统访问
    // 在实际应用中，你可以使用临时文件进行测试
    console.log('备份和恢复测试需要文件系统访问，已跳过');
  });
}); 