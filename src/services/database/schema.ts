/**
 * 数据库表结构定义
 * 提供创建表和索引的功能
 */

import { IDatabaseService } from './interfaces';

/**
 * 创建数据库表
 * @param db 数据库服务实例
 */
export async function createTables(db: IDatabaseService): Promise<void> {
  try {
    console.log('开始创建数据库表...');
    
    // 配置表
    console.log('创建 configs 表...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS configs (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        group_name TEXT,
        description TEXT
      )
    `);
    console.log('configs 表创建成功');
    
    // 配置元数据表
    console.log('创建 config_metadata 表...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS config_metadata (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        group_name TEXT NOT NULL,
        type TEXT NOT NULL,
        default_value TEXT NOT NULL,
        is_system INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        validation_rules TEXT
      )
    `);
    console.log('config_metadata 表创建成功');
    
    // 配置变更事件表
    console.log('创建 config_change_events 表...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS config_change_events (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL,
        old_value TEXT NOT NULL,
        new_value TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        reason TEXT
      )
    `);
    console.log('config_change_events 表创建成功');
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
        preview TEXT,
        source_assistant_id TEXT,
        current_config TEXT
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
      CREATE TABLE IF NOT EXISTS ai_model_providers (
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
      CREATE TABLE IF NOT EXISTS ai_models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        group_id TEXT NOT NULL,
        capabilities TEXT NOT NULL,
        model_id TEXT NOT NULL,
        context_window INTEGER NOT NULL,
        max_tokens INTEGER NOT NULL,
        config TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES ai_model_providers(id) ON DELETE CASCADE
      )
    `);
    
    // 默认模型表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS default_models (
        type TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (provider_id) REFERENCES ai_model_providers(id) ON DELETE CASCADE,
        FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE
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

    createAssistantsTable(db); // 添加助手表的创建
    
    // 新增MCP服务器配置表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS mcp_server_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        transport_type TEXT CHECK(transport_type IN ('SSE', 'Stdio')) NOT NULL,
        sse_url TEXT,
        sse_headers TEXT,  -- JSON字符串
        command TEXT,
        args TEXT,         -- JSON数组
        env_vars TEXT,     -- JSON对象
        timeout_secs INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        client_version TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建索引
    console.log('创建索引...');
    await createIndexes(db);
    console.log('索引创建成功');
    
    console.log('所有表和索引创建成功');
  } catch (error) {
    console.error('创建表失败:', error);
    throw error;
  }
}

/**
 * 创建数据库索引
 * @param db 数据库服务实例
 */
export async function createIndexes(db: IDatabaseService): Promise<void> {
  // 配置索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_configs_group_name
    ON configs(group_name)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_config_metadata_group_name
    ON config_metadata(group_name)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_config_metadata_display_order
    ON config_metadata(display_order)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_config_change_events_key
    ON config_change_events(key)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_config_change_events_timestamp
    ON config_change_events(timestamp)
  `);
  
  // 助手索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_assistants_name 
    ON assistants (name)
  `);
  
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_assistants_is_default 
    ON assistants (is_default)
  `);
  
  // 话题索引 - 添加对助手ID的索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_topics_source_assistant_id 
    ON topics (source_assistant_id)
  `);

  // 新增索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_mcp_config_name 
    ON mcp_server_configs(name)
  `);
}

/**
 * 删除数据库表
 * @param db 数据库服务实例
 */
export async function dropTables(db: IDatabaseService): Promise<void> {
  await db.transaction(async () => {
    await db.execute('DROP TABLE IF EXISTS config_change_events');
    await db.execute('DROP TABLE IF EXISTS config_metadata');
    await db.execute('DROP TABLE IF EXISTS configs');
    // 按照依赖关系的反序删除表
    await db.execute('DROP TABLE IF EXISTS encryption_keys');
    await db.execute('DROP TABLE IF EXISTS default_models');
    await db.execute('DROP TABLE IF EXISTS ai_models');
    await db.execute('DROP TABLE IF EXISTS ai_model_providers');
    await db.execute('DROP TABLE IF EXISTS messages');
    await db.execute('DROP TABLE IF EXISTS topics');
    await db.execute('DROP TABLE IF EXISTS assistants'); // 添加助手表的删除
    await db.execute('DROP TABLE IF EXISTS mcp_server_configs');
  });
}

/**
 * 创建助手表的迁移
 */
export async function createAssistantsTable(db: IDatabaseService): Promise<void> {
  try {
    console.log('创建助手表...');
    
    // 创建助手表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assistants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        avatar TEXT,
        provider_id TEXT,
        model_id TEXT,
        system_prompt TEXT NOT NULL,
        temperature REAL,
        memory_strategy TEXT,
        context_window_size INTEGER,
        enabled_tool_ids TEXT,
        knowledge_base_ids TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        tags TEXT
      )
    `);

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_assistants_name 
      ON assistants (name)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_assistants_is_default 
      ON assistants (is_default)
    `);

    console.log('助手表创建成功');
  } catch (error) {
    console.error('创建助手表失败:', error);
    throw error;
  }
}