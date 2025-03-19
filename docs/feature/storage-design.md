# 数据库重构设计方案与实施步骤

## 设计方案

### 1. 数据库架构

#### 1.1 核心表设计

```sql
-- 配置表
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 聊天话题表
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_model_id TEXT,
  last_provider_id TEXT,
  message_count INTEGER DEFAULT 0,
  preview TEXT
);

-- 聊天消息表
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  model_id TEXT,
  provider_id TEXT,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- 模型提供商表
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  api_key TEXT,
  api_url TEXT NOT NULL,
  config TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 模型表
CREATE TABLE models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  capabilities TEXT NOT NULL, -- 存储为JSON数组
  config TEXT, -- 存储为JSON对象
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

-- 默认模型表
CREATE TABLE default_models (
  type TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
);

-- 加密密钥表
CREATE TABLE encryption_keys (
  id TEXT PRIMARY KEY,
  topic_id TEXT UNIQUE,
  algorithm TEXT NOT NULL,
  key_data TEXT NOT NULL, -- 加密存储的密钥数据
  created_at TEXT NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
```

#### 1.2 索引设计

```sql
-- 消息索引
CREATE INDEX idx_messages_topic_id ON messages(topic_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- 模型索引
CREATE INDEX idx_models_provider_id ON models(provider_id);
CREATE INDEX idx_models_group_id ON models(group_id);

-- 加密密钥索引
CREATE INDEX idx_encryption_keys_topic_id ON encryption_keys(topic_id);
```

### 2. 数据库管理服务

#### 2.1 数据库服务接口

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
```

#### 2.2 SQLite实现

```typescript
// src/services/database/SQLiteService.ts
export class SQLiteService implements IDatabaseService {
  private db: Database | null = null;
  private dbPath: string = '';
  
  // 实现接口方法
  // ...
}
```

### 3. 存储库模式

#### 3.1 基础存储库接口

```typescript
// src/repositories/interfaces.ts
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}
```

#### 3.2 具体存储库实现

```typescript
// src/repositories/TopicRepository.ts
export class TopicRepository implements IRepository<ChatTopic, string> {
  constructor(private db: IDatabaseService) {}
  
  // 实现接口方法
  // ...
  
  // 特定方法
  findByTitle(title: string): Promise<ChatTopic[]> {
    // ...
  }
}

// src/repositories/MessageRepository.ts
export class MessageRepository implements IRepository<ChatMessage, string> {
  constructor(private db: IDatabaseService) {}
  
  // 实现接口方法
  // ...
  
  // 特定方法
  findByTopicId(topicId: string): Promise<ChatMessage[]> {
    // ...
  }
}

// 其他存储库类似实现
```

### 4. 服务层

#### 4.1 服务接口

```typescript
// src/services/interfaces.ts
export interface IService {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
```

#### 4.2 聊天服务

```typescript
// src/services/chat/ChatService.ts
export class ChatService implements IService {
  constructor(
    private topicRepository: TopicRepository,
    private messageRepository: MessageRepository,
    private modelService: ModelService
  ) {}
  
  // 实现接口方法
  // ...
  
  // 业务方法
  async sendMessage(topicId: string, content: string): Promise<ChatMessage> {
    // ...
  }
}
```

### 5. 数据库位置管理

#### 5.1 配置服务

```typescript
// src/services/system/ConfigService.ts
export class ConfigService implements IService {
  constructor(private db: IDatabaseService) {}
  
  // 获取数据库位置
  async getDatabaseLocation(): Promise<string> {
    const config = await this.db.get<{value: string}>(
      'SELECT value FROM config WHERE key = ?',
      ['database_location']
    );
    return config?.value || this.getDefaultDatabaseLocation();
  }
  
  // 设置数据库位置
  async setDatabaseLocation(location: string): Promise<void> {
    await this.db.execute(
      'INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)',
      ['database_location', location, new Date().toISOString()]
    );
  }
  
  // 获取默认数据库位置
  private getDefaultDatabaseLocation(): string {
    // 使用Tauri API获取AppData目录
    // ...
  }
}
```

#### 5.2 数据库位置迁移

```typescript
// src/services/database/DatabaseMigrationService.ts
export class DatabaseMigrationService {
  constructor(private db: IDatabaseService, private configService: ConfigService) {}
  
  // 迁移数据库到新位置
  async migrateDatabase(newLocation: string): Promise<void> {
    // 1. 备份当前数据库
    const currentLocation = await this.configService.getDatabaseLocation();
    await this.db.backup(currentLocation + '.bak');
    
    // 2. 关闭当前数据库连接
    await this.db.close();
    
    // 3. 复制数据库文件到新位置
    // 使用Tauri的文件系统API
    
    // 4. 使用新位置重新初始化数据库
    await this.db.changeLocation(newLocation);
    
    // 5. 更新配置
    await this.configService.setDatabaseLocation(newLocation);
  }
}
```

## 实施步骤

### 步骤1: 创建数据库服务和基础架构

**任务:**
1. 实现SQLiteService
2. 创建数据库初始化脚本
3. 实现基本的CRUD操作

**可验证方法:**
- 单元测试: 测试数据库连接、初始化和基本操作
- 集成测试: 验证数据库文件是否正确创建
- 手动验证: 使用SQLite浏览器查看数据库结构

```typescript
// 测试代码示例
describe('SQLiteService', () => {
  let db: SQLiteService;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:'); // 使用内存数据库进行测试
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should create tables', async () => {
    const tables = await db.query<{name: string}>('SELECT name FROM sqlite_master WHERE type="table"');
    expect(tables.map(t => t.name)).toContain('topics');
    expect(tables.map(t => t.name)).toContain('messages');
    // 检查其他表...
  });
  
  it('should perform basic CRUD operations', async () => {
    // 插入测试
    await db.execute('INSERT INTO config (key, value, updated_at) VALUES (?, ?, ?)', 
      ['test_key', 'test_value', new Date().toISOString()]);
    
    // 查询测试
    const result = await db.get<{value: string}>('SELECT value FROM config WHERE key = ?', ['test_key']);
    expect(result?.value).toBe('test_value');
    
    // 更新测试
    await db.execute('UPDATE config SET value = ? WHERE key = ?', ['updated_value', 'test_key']);
    const updated = await db.get<{value: string}>('SELECT value FROM config WHERE key = ?', ['test_key']);
    expect(updated?.value).toBe('updated_value');
    
    // 删除测试
    await db.execute('DELETE FROM config WHERE key = ?', ['test_key']);
    const deleted = await db.get<{value: string}>('SELECT value FROM config WHERE key = ?', ['test_key']);
    expect(deleted).toBeNull();
  });
});
```

### 步骤2: 实现存储库层

**任务:**
1. 实现TopicRepository
2. 实现MessageRepository
3. 实现其他存储库

**可验证方法:**
- 单元测试: 测试每个存储库的CRUD操作
- 集成测试: 验证存储库之间的关系约束
- 功能测试: 验证复杂查询和业务逻辑

```typescript
// 测试代码示例
describe('TopicRepository', () => {
  let db: SQLiteService;
  let repository: TopicRepository;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
    repository = new TopicRepository(db);
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should create a topic', async () => {
    const topic = await repository.create({
      title: 'Test Topic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      preview: 'Test preview'
    });
    
    expect(topic.id).toBeDefined();
    expect(topic.title).toBe('Test Topic');
  });
  
  it('should find a topic by id', async () => {
    const created = await repository.create({
      title: 'Test Topic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      preview: 'Test preview'
    });
    
    const found = await repository.findById(created.id);
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Test Topic');
  });
  
  // 更多测试...
});
```

### 步骤3: 实现数据迁移

**任务:**
1. 创建数据迁移服务
2. 实现从JSON文件到数据库的迁移
3. 实现数据库版本升级机制

**可验证方法:**
- 单元测试: 测试迁移逻辑
- 集成测试: 验证迁移后的数据完整性
- 性能测试: 测量大量数据迁移的性能

```typescript
// 测试代码示例
describe('DataMigrationService', () => {
  let db: SQLiteService;
  let migrationService: DataMigrationService;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
    migrationService = new DataMigrationService(db);
    
    // 创建测试JSON文件
    // ...
  });
  
  afterEach(async () => {
    await db.close();
    // 清理测试文件
    // ...
  });
  
  it('should migrate topics from JSON to database', async () => {
    // 准备测试数据
    const testTopics = [/* 测试数据 */];
    
    // 执行迁移
    await migrationService.migrateTopics();
    
    // 验证迁移结果
    const topicRepository = new TopicRepository(db);
    const migratedTopics = await topicRepository.findAll();
    
    expect(migratedTopics.length).toBe(testTopics.length);
    // 验证数据完整性
    // ...
  });
  
  it('should migrate messages from JSON to database', async () => {
    // 类似的测试逻辑
    // ...
  });
});
```

### 步骤4: 实现服务层

**任务:**
1. 重构ChatService使用新的存储库
2. 重构ModelService使用新的存储库
3. 实现其他服务

**可验证方法:**
- 单元测试: 测试服务层逻辑
- 集成测试: 验证服务之间的交互
- 端到端测试: 验证完整的用户流程

```typescript
// 测试代码示例
describe('ChatService', () => {
  let db: SQLiteService;
  let topicRepository: TopicRepository;
  let messageRepository: MessageRepository;
  let modelService: ModelService;
  let chatService: ChatService;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
    
    topicRepository = new TopicRepository(db);
    messageRepository = new MessageRepository(db);
    modelService = new ModelService(/* 依赖 */);
    
    chatService = new ChatService(topicRepository, messageRepository, modelService);
    await chatService.initialize();
    
    // 准备测试数据
    // ...
  });
  
  afterEach(async () => {
    await chatService.dispose();
    await db.close();
  });
  
  it('should send a message and create a response', async () => {
    // 创建测试话题
    const topic = await topicRepository.create({
      title: 'Test Topic',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      preview: ''
    });
    
    // 发送消息
    const message = await chatService.sendMessage(topic.id, 'Hello, world!');
    
    // 验证消息已保存
    expect(message.id).toBeDefined();
    expect(message.content).toBe('Hello, world!');
    
    // 验证话题已更新
    const updatedTopic = await topicRepository.findById(topic.id);
    expect(updatedTopic?.message_count).toBe(1);
    expect(updatedTopic?.preview).toBe('Hello, world!');
  });
  
  // 更多测试...
});
```

### 步骤5: 实现数据库位置管理

**任务:**
1. 实现数据库位置配置
2. 实现数据库迁移功能
3. 创建用户界面允许选择数据库位置

**可验证方法:**
- 单元测试: 测试位置管理逻辑
- 集成测试: 验证数据库迁移功能
- 用户测试: 验证用户界面和用户体验

```typescript
// 测试代码示例
describe('DatabaseLocationManager', () => {
  let db: SQLiteService;
  let configService: ConfigService;
  let locationManager: DatabaseLocationManager;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
    
    configService = new ConfigService(db);
    locationManager = new DatabaseLocationManager(db, configService);
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should get default database location', async () => {
    const location = await locationManager.getDatabaseLocation();
    expect(location).toBeDefined();
    // 验证默认位置是否正确
  });
  
  it('should change database location', async () => {
    // 准备测试
    const originalLocation = await locationManager.getDatabaseLocation();
    const newLocation = '/path/to/new/location/database.db';
    
    // 模拟文件系统操作
    // ...
    
    // 执行迁移
    await locationManager.changeDatabaseLocation(newLocation);
    
    // 验证位置已更新
    const updatedLocation = await locationManager.getDatabaseLocation();
    expect(updatedLocation).toBe(newLocation);
    
    // 验证数据库文件已迁移
    // ...
  });
});
```

### 步骤6: 集成到UI

**任务:**
1. 更新UI组件使用新的服务
2. 创建数据库设置页面
3. 实现数据库位置选择UI

**可验证方法:**
- 组件测试: 测试UI组件
- 端到端测试: 验证完整的用户流程
- 用户测试: 收集用户反馈

```typescript
// 测试代码示例 (使用React Testing Library)
describe('DatabaseSettingsPage', () => {
  it('should display current database location', async () => {
    // 渲染组件
    render(<DatabaseSettingsPage />);
    
    // 等待加载
    await screen.findByText('数据库设置');
    
    // 验证当前位置显示
    expect(screen.getByTestId('current-location')).toHaveTextContent('/path/to/database.db');
  });
  
  it('should allow changing database location', async () => {
    // 模拟服务
    const mockLocationManager = {
      getDatabaseLocation: jest.fn().mockResolvedValue('/current/path/database.db'),
      changeDatabaseLocation: jest.fn().mockResolvedValue(undefined)
    };
    
    // 渲染组件
    render(<DatabaseSettingsPage locationManager={mockLocationManager} />);
    
    // 点击更改按钮
    fireEvent.click(screen.getByText('更改位置'));
    
    // 模拟选择新位置
    // ...
    
    // 点击确认
    fireEvent.click(screen.getByText('确认'));
    
    // 验证服务调用
    expect(mockLocationManager.changeDatabaseLocation).toHaveBeenCalledWith('/new/path/database.db');
  });
});
```

### 步骤7: 性能优化

**任务:**
1. 实现数据库索引
2. 优化查询
3. 实现缓存机制

**可验证方法:**
- 性能测试: 测量查询性能
- 负载测试: 测试大数据量下的性能
- 基准测试: 与旧实现比较性能

```typescript
// 性能测试示例
describe('Database Performance', () => {
  let db: SQLiteService;
  let messageRepository: MessageRepository;
  
  beforeEach(async () => {
    db = new SQLiteService();
    await db.initialize(':memory:');
    messageRepository = new MessageRepository(db);
    
    // 插入大量测试数据
    await db.transaction(async () => {
      for (let i = 0; i < 10000; i++) {
        await messageRepository.create({
          topic_id: 'test-topic',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i}`,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
  
  afterEach(async () => {
    await db.close();
  });
  
  it('should efficiently query messages by topic', async () => {
    const startTime = performance.now();
    
    const messages = await messageRepository.findByTopicId('test-topic');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(messages.length).toBe(10000);
    expect(duration).toBeLessThan(100); // 期望查询时间小于100ms
  });
  
  it('should efficiently paginate messages', async () => {
    const startTime = performance.now();
    
    const messages = await messageRepository.findByTopicIdPaginated('test-topic', 50, 0);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(messages.length).toBe(50);
    expect(duration).toBeLessThan(20); // 期望分页查询时间小于20ms
  });
});
```

## 实施时间线

1. **第1周**: 设计数据库架构和服务接口
   - 完成数据库表设计
   - 定义服务接口
   - 创建项目结构

2. **第2-3周**: 实现基础设施
   - 实现SQLiteService
   - 实现存储库层
   - 编写单元测试

3. **第4-5周**: 实现数据迁移
   - 创建迁移服务
   - 实现JSON到数据库的迁移
   - 测试数据完整性

4. **第6-7周**: 重构服务层
   - 更新ChatService
   - 更新ModelService
   - 更新其他服务

5. **第8周**: 实现数据库位置管理
   - 实现位置配置
   - 实现数据库迁移
   - 创建设置UI

6. **第9-10周**: 集成和测试
   - 集成到UI
   - 进行端到端测试
   - 性能优化

7. **第11-12周**: 最终测试和发布
   - 用户测试
   - 修复问题
   - 准备发布

## 风险和缓解措施

1. **数据丢失风险**
   - 缓解: 实现自动备份机制，每次迁移前创建备份
   - 缓解: 提供数据恢复功能

2. **性能下降风险**
   - 缓解: 实施性能测试，确保查询性能
   - 缓解: 实现缓存机制，减少数据库访问

3. **用户体验影响**
   - 缓解: 在后台线程执行数据迁移
   - 缓解: 提供进度指示器和取消选项

4. **兼容性问题**
   - 缓解: 支持旧版本数据格式
   - 缓解: 实现版本检测和自动升级

## 总结

本设计方案提供了一个全面的数据库重构计划，将所有数据迁移到SQLite数据库中，并允许用户自定义数据库位置。通过采用存储库模式和服务层抽象，我们可以实现清晰的代码结构和良好的可测试性。每个实施步骤都包含可验证的方法，确保重构过程可控且高质量。
