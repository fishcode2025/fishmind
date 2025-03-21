# 数据库与服务层架构指南

本文档提供了重构后的数据库与服务层架构的全面说明，包括目录结构、核心组件、使用方法以及扩展指南。无论是理解现有代码还是添加新功能，本文档都应该是您的首要参考资料。

## 1. 架构概述

我们采用了分层架构，主要包括以下几层：

1. **数据库层**：负责与SQLite数据库的直接交互
2. **存储库层**：提供数据访问抽象，封装CRUD操作
3. **服务层**：实现业务逻辑，使用存储库访问数据
4. **UI层**：展示界面，通过服务层获取数据

这种架构的主要优势：

- **关注点分离**：每一层只关注自己的职责
- **可测试性**：各层之间通过接口交互，便于单元测试
- **可维护性**：修改一层的实现不会影响其他层
- **可扩展性**：添加新功能只需在相应层添加新组件

## 2. 目录结构

```
src/
├── models/                 # 数据模型定义
│   ├── chat.ts             # 聊天相关模型
│   ├── model.ts            # AI模型相关模型
│   ├── config.ts           # 配置相关模型
│   └── index.ts            # 导出所有模型
│
├── services/               # 服务层
│   ├── database/           # 数据库服务
│   │   ├── interfaces.ts   # 数据库服务接口
│   │   ├── SQLiteService.ts # SQLite实现
│   │   └── schema.ts       # 数据库表结构定义
│   │
│   ├── chat/               # 聊天服务
│   ├── model/              # 模型服务
│   ├── system/             # 系统服务
│   ├── interfaces.ts       # 服务接口定义
│   ├── ServiceContainer.ts # 服务容器
│   └── index.ts            # 服务导出
│
├── repositories/           # 存储库层
│   ├── interfaces.ts       # 存储库接口
│   ├── TopicRepository.ts  # 话题存储库
│   ├── MessageRepository.ts # 消息存储库
│   ├── ProviderRepository.ts # 提供商存储库
│   ├── ModelRepository.ts  # 模型存储库
│   ├── ConfigRepository.ts # 配置存储库
│   └── index.ts            # 存储库导出
│
└── errors/                 # 错误处理
    └── index.ts            # 错误类型和错误类
```

## 3. 核心组件说明

### 3.1 数据模型 (models/)

数据模型定义了应用中使用的所有数据结构。

#### models/chat.ts

```typescript
// 聊天话题模型
export interface Topic {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastModelId?: string;
  lastProviderId?: string;
  messageCount: number;
  preview?: string;
}

// 聊天消息模型
export interface Message {
  id: string;
  topicId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelId?: string;
  providerId?: string;
}
```

#### models/model.ts

```typescript
// 模型提供商
export interface Provider {
  id: string;
  name: string;
  enabled: boolean;
  apiKey?: string;
  apiUrl: string;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// AI模型
export interface Model {
  id: string;
  name: string;
  providerId: string;
  groupId: string;
  capabilities: string[];
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 数据库服务 (services/database/)

数据库服务提供了与SQLite数据库交互的功能。

#### services/database/interfaces.ts

```typescript
// 数据库服务接口
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

#### services/database/SQLiteService.ts

SQLiteService实现了IDatabaseService接口，使用Tauri的SQLite插件与数据库交互。

#### services/database/schema.ts

定义了数据库表结构和索引，提供了创建和删除表的功能。

### 3.3 存储库 (repositories/)

存储库提供了数据访问抽象，封装了CRUD操作。

#### repositories/interfaces.ts

```typescript
// 通用存储库接口
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}
```

#### repositories/TopicRepository.ts

```typescript
// 话题存储库
export class TopicRepository implements IRepository<Topic, string> {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Topic | null> {
    return this.db.get<Topic>(
      'SELECT * FROM topics WHERE id = ?',
      [id]
    );
  }
  
  async findAll(): Promise<Topic[]> {
    return this.db.query<Topic>(
      'SELECT * FROM topics ORDER BY updated_at DESC'
    );
  }
  
  // 其他方法...
  
  // 特定方法
  async findByTitle(title: string): Promise<Topic[]> {
    return this.db.query<Topic>(
      'SELECT * FROM topics WHERE title LIKE ?',
      [`%${title}%`]
    );
  }
}
```

### 3.4 服务层 (services/)

服务层实现了业务逻辑，使用存储库访问数据。

#### services/interfaces.ts

```typescript
// 通用服务接口
export interface IService {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
```

#### services/ServiceContainer.ts

```typescript
// 服务容器
export class ServiceContainer {
  private static services: Map<string, any> = new Map();
  
  static register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }
  
  static get<T>(key: string): T {
    return this.services.get(key) as T;
  }
  
  static async initialize(): Promise<void> {
    // 初始化所有服务
    for (const service of this.services.values()) {
      if (typeof service.initialize === 'function') {
        await service.initialize();
      }
    }
  }
}
```

#### services/chat/ChatService.ts

```typescript
// 聊天服务
export class ChatService implements IService {
  constructor(
    private topicRepository: TopicRepository,
    private messageRepository: MessageRepository,
    private modelService: ModelService
  ) {}
  
  async initialize(): Promise<void> {
    // 初始化逻辑
  }
  
  async dispose(): Promise<void> {
    // 清理逻辑
  }
  
  // 业务方法
  async sendMessage(topicId: string, content: string): Promise<Message> {
    // 实现发送消息的业务逻辑
  }
}
```

## 4. 如何使用

### 4.1 初始化应用

应用启动时，需要初始化服务容器和数据库：

```typescript
// src/App.tsx
import { ServiceContainer } from './services/ServiceContainer';
import { SQLiteService } from './services/database/SQLiteService';
import { TopicRepository } from './repositories/TopicRepository';
import { MessageRepository } from './repositories/MessageRepository';
import { ChatService } from './services/chat/ChatService';

// 初始化应用
const initializeApp = async () => {
  // 创建数据库服务
  const dbService = new SQLiteService();
  await dbService.initialize();
  
  // 创建存储库
  const topicRepository = new TopicRepository(dbService);
  const messageRepository = new MessageRepository(dbService);
  
  // 创建服务
  const chatService = new ChatService(topicRepository, messageRepository);
  
  // 注册服务
  ServiceContainer.register('database', dbService);
  ServiceContainer.register('chat', chatService);
  
  // 初始化所有服务
  await ServiceContainer.initialize();
};
```

### 4.2 在UI中使用服务

在UI组件中，可以通过服务容器获取服务：

```typescript
// src/components/ChatPanel.tsx
import { useEffect, useState } from 'react';
import { ServiceContainer } from '../services/ServiceContainer';
import { ChatService } from '../services/chat/ChatService';
import { Topic, Message } from '../models';

const ChatPanel = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const chatService = ServiceContainer.get<ChatService>('chat');
  
  useEffect(() => {
    const loadTopics = async () => {
      const topics = await chatService.getAllTopics();
      setTopics(topics);
    };
    
    loadTopics();
  }, []);
  
  // 组件逻辑...
};
```

## 5. 如何添加新功能

### 5.1 添加新的数据模型

1. 在`models/`目录下创建或修改相应的文件
2. 定义新的接口或修改现有接口
3. 在`models/index.ts`中导出新模型

例如，添加用户模型：

```typescript
// models/user.ts
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

// models/index.ts
export * from './chat';
export * from './model';
export * from './config';
export * from './user'; // 添加新导出
```

### 5.2 更新数据库表结构

1. 修改`services/database/schema.ts`，添加新表或修改现有表
2. 实现数据库迁移逻辑（如果需要）

例如，添加用户表：

```typescript
// services/database/schema.ts
export async function createTables(db: IDatabaseService): Promise<void> {
  await db.transaction(async () => {
    // 现有表...
    
    // 用户表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
    // 创建索引
    await createIndexes(db);
  });
}

export async function createIndexes(db: IDatabaseService): Promise<void> {
  // 现有索引...
  
  // 用户索引
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_username 
    ON users(username)
  `);
}
```

### 5.3 添加新的存储库

1. 在`repositories/`目录下创建新文件
2. 实现`IRepository`接口
3. 在`repositories/index.ts`中导出新存储库

例如，添加用户存储库：

```typescript
// repositories/UserRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { IRepository } from './interfaces';
import { User } from '../models';

export class UserRepository implements IRepository<User, string> {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<User | null> {
    return this.db.get<User>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
  }
  
  async findAll(): Promise<User[]> {
    return this.db.query<User>(
      'SELECT * FROM users ORDER BY created_at DESC'
    );
  }
  
  async create(user: Omit<User, 'id'>): Promise<User> {
    const id = crypto.randomUUID();
    await this.db.execute(
      'INSERT INTO users (id, username, email, created_at) VALUES (?, ?, ?, ?)',
      [id, user.username, user.email, user.createdAt]
    );
    return { id, ...user };
  }
  
  async update(id: string, user: Partial<User>): Promise<User> {
    // 实现更新逻辑
  }
  
  async delete(id: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
  }
  
  // 特定方法
  async findByUsername(username: string): Promise<User | null> {
    return this.db.get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }
}

// repositories/index.ts
export * from './TopicRepository';
export * from './MessageRepository';
export * from './UserRepository'; // 添加新导出
```

### 5.4 添加新的服务

1. 在`services/`目录下创建新目录或文件
2. 实现`IService`接口
3. 在服务容器中注册新服务

例如，添加用户服务：

```typescript
// services/user/UserService.ts
import { IService } from '../interfaces';
import { UserRepository } from '../../repositories';
import { User } from '../../models';

export class UserService implements IService {
  constructor(private userRepository: UserRepository) {}
  
  async initialize(): Promise<void> {
    // 初始化逻辑
  }
  
  async dispose(): Promise<void> {
    // 清理逻辑
  }
  
  // 业务方法
  async createUser(username: string, email: string): Promise<User> {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // 创建用户
    return this.userRepository.create({
      username,
      email,
      createdAt: new Date().toISOString()
    });
  }
  
  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }
}

// 在应用初始化时注册服务
const initializeApp = async () => {
  // 现有初始化代码...
  
  // 创建用户存储库和服务
  const userRepository = new UserRepository(dbService);
  const userService = new UserService(userRepository);
  
  // 注册服务
  ServiceContainer.register('user', userService);
};
```

### 5.5 在UI中使用新服务

```typescript
// src/components/UserPanel.tsx
import { useEffect, useState } from 'react';
import { ServiceContainer } from '../services/ServiceContainer';
import { UserService } from '../services/user/UserService';
import { User } from '../models';

const UserPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const userService = ServiceContainer.get<UserService>('user');
  
  useEffect(() => {
    const loadUsers = async () => {
      const users = await userService.getAllUsers();
      setUsers(users);
    };
    
    loadUsers();
  }, []);
  
  // 组件逻辑...
};
```

## 6. 最佳实践

### 6.1 数据库操作

- 始终使用参数化查询，避免SQL注入
- 在存储库中封装所有SQL语句，不要在服务层直接使用SQL
- 使用事务确保数据一致性
- 为频繁查询的字段创建索引

### 6.2 错误处理

- 使用自定义错误类型，便于区分不同类型的错误
- 在存储库层捕获数据库错误，转换为应用错误
- 在服务层处理业务逻辑错误
- 在UI层友好地展示错误信息

### 6.3 性能优化

- 使用分页查询处理大量数据
- 实现缓存机制减少数据库访问
- 优化查询语句，避免不必要的连接和子查询
- 定期监控数据库性能，及时优化

### 6.4 测试

- 为每个存储库和服务编写单元测试
- 使用内存数据库进行测试，避免影响实际数据
- 模拟依赖项，隔离测试对象
- 编写集成测试验证组件之间的交互

## 7. 故障排除

### 7.1 常见问题

#### 数据库连接失败

- 检查数据库文件路径是否正确
- 确保应用有足够的权限访问数据库文件
- 验证Tauri的SQLite插件是否正确配置

#### 查询返回意外结果

- 检查SQL语句是否正确
- 验证参数类型和顺序
- 使用SQLite浏览器直接查询数据库进行验证

#### 服务未正确初始化

- 检查服务容器中是否注册了服务
- 确保所有依赖项都已正确初始化
- 查看控制台错误日志

### 7.2 调试技巧

- 使用SQLite浏览器查看数据库内容
- 在关键位置添加日志记录
- 使用事务的回滚功能进行安全测试
- 创建测试脚本验证功能

## 8. 总结

本文档提供了重构后的数据库与服务层架构的全面说明。通过遵循这些指南，您可以轻松理解现有代码并添加新功能。

记住以下关键点：

1. **分层架构**：数据库层 → 存储库层 → 服务层 → UI层
2. **关注点分离**：每一层只关注自己的职责
3. **接口驱动**：通过接口定义组件之间的交互
4. **依赖注入**：使用服务容器管理依赖关系

如果您需要添加新功能，请按照第5节中的步骤操作，确保遵循最佳实践。

如有任何问题或建议，请联系项目维护者。 