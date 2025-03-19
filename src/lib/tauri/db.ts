import { configService } from '../../services/system/ConfigService';
import { directoryService } from '../../services/system/DirectoryService';
import Database from '@tauri-apps/plugin-sql';

import { ensureDir } from './fs';
let db: Database | null = null;

/**
 * 获取数据库连接
 */
export async function getDatabase(): Promise<Database> {
  if (db) return db;
  
  try {
    // 确保数据库目录存在
    await directoryService.ensureDirectory(configService.getSystemConfig().paths.database);
    
    // 获取数据库文件路径
    const dbPath = `${configService.getSystemConfig().paths.database}/${configService.getSystemConfig().database.filename}`;
    
    // 连接SQLite数据库
    db = await Database.load(`sqlite:${dbPath}`);
    return db;
  } catch (error) {
    console.error('Failed to connect to database', error);
    throw error;
  }
}

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  
  // 创建话题表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_topics (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_model_id TEXT NOT NULL,
      last_provider_id TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      preview TEXT
    )
  `);
  
  // 创建索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_chat_topics_updated_at ON chat_topics(updated_at)
  `);
}

/**
 * 执行查询并返回结果
 */
export async function query<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const result = await db.select<T[]>(sql, params);
  return result as T[];
}

/**
 * 执行更新操作并返回受影响的行数
 */
export async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  await db.execute(sql, params);
} 