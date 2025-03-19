# 阶段二：存储库层实现详细执行计划

## 概述

阶段二的目标是实现存储库模式，为每种数据类型提供统一的CRUD操作接口。这一阶段将建立在阶段一已完成的数据库服务基础上，进一步抽象数据访问层，使业务逻辑与数据存储细节分离。

## 1. 定义存储库接口

### 任务描述
定义通用存储库接口，为所有具体存储库提供统一的抽象。

### 具体步骤
1. 创建`src/repositories/interfaces.ts`文件
2. 定义通用存储库接口`IRepository<T, ID>`
3. 定义特定领域的存储库接口

### 代码示例
```typescript
// src/repositories/interfaces.ts
/**
 * 通用存储库接口
 * 定义了基本的CRUD操作
 * @template T 实体类型
 * @template ID 实体ID类型
 */
export interface IRepository<T, ID> {
  /**
   * 根据ID查找实体
   * @param id 实体ID
   * @returns 找到的实体或null
   */
  findById(id: ID): Promise<T | null>;
  
  /**
   * 查找所有实体
   * @returns 实体列表
   */
  findAll(): Promise<T[]>;
  
  /**
   * 创建新实体
   * @param entity 要创建的实体（不包含ID）
   * @returns 创建后的实体（包含ID）
   */
  create(entity: Omit<T, 'id'>): Promise<T>;
  
  /**
   * 更新实体
   * @param id 实体ID
   * @param entity 要更新的实体字段
   * @returns 更新后的实体
   */
  update(id: ID, entity: Partial<T>): Promise<T>;
  
  /**
   * 删除实体
   * @param id 实体ID
   */
  delete(id: ID): Promise<void>;
  
  /**
   * 计算实体总数
   * @returns 实体总数
   */
  count(): Promise<number>;
}

/**
 * 话题存储库接口
 * 扩展通用存储库接口，添加话题特定的方法
 */
export interface ITopicRepository extends IRepository<Topic, string> {
  /**
   * 根据标题查找话题
   * @param title 话题标题
   * @returns 匹配的话题列表
   */
  findByTitle(title: string): Promise<Topic[]>;
  
  /**
   * 查找最近更新的话题
   * @param limit 限制数量
   * @returns 最近更新的话题列表
   */
  findRecent(limit: number): Promise<Topic[]>;
  
  /**
   * 增加话题的消息计数
   * @param id 话题ID
   * @returns 更新后的话题
   */
  incrementMessageCount(id: string): Promise<Topic>;
  
  /**
   * 更新话题预览
   * @param id 话题ID
   * @param preview 预览内容
   * @returns 更新后的话题
   */
  updatePreview(id: string, preview: string): Promise<Topic>;
}

/**
 * 消息存储库接口
 * 扩展通用存储库接口，添加消息特定的方法
 */
export interface IMessageRepository extends IRepository<Message, string> {
  /**
   * 根据话题ID查找消息
   * @param topicId 话题ID
   * @returns 该话题下的所有消息
   */
  findByTopicId(topicId: string): Promise<Message[]>;
  
  /**
   * 分页查询话题消息
   * @param topicId 话题ID
   * @param page 页码
   * @param pageSize 每页大小
   * @returns 分页消息列表
   */
  findByTopicIdPaginated(topicId: string, page: number, pageSize: number): Promise<Message[]>;
  
  /**
   * 查找话题最后一条消息
   * @param topicId 话题ID
   * @returns 最后一条消息
   */
  findLastByTopicId(topicId: string): Promise<Message | null>;
  
  /**
   * 删除话题下的所有消息
   * @param topicId 话题ID
   */
  deleteByTopicId(topicId: string): Promise<void>;
}

// 其他存储库接口...
```

### 测试方法
```typescript
// src/repositories/__tests__/interfaces.test.ts
import { IRepository, ITopicRepository, IMessageRepository } from '../interfaces';
import { Topic, Message } from '../../models';

describe('Repository Interfaces', () => {
  it('should define all required methods in IRepository', () => {
    // 创建一个模拟实现，检查是否包含所有必需的方法
    const mockRepository: IRepository<any, any> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    };
    
    // 验证接口定义的完整性
    expect(mockRepository).toBeDefined();
    expect(typeof mockRepository.findById).toBe('function');
    expect(typeof mockRepository.findAll).toBe('function');
    expect(typeof mockRepository.create).toBe('function');
    expect(typeof mockRepository.update).toBe('function');
    expect(typeof mockRepository.delete).toBe('function');
    expect(typeof mockRepository.count).toBe('function');
  });
  
  it('should define all required methods in ITopicRepository', () => {
    // 创建一个模拟实现，检查是否包含所有必需的方法
    const mockTopicRepository: ITopicRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findByTitle: jest.fn(),
      findRecent: jest.fn(),
      incrementMessageCount: jest.fn(),
      updatePreview: jest.fn()
    };
    
    // 验证接口定义的完整性
    expect(mockTopicRepository).toBeDefined();
    expect(typeof mockTopicRepository.findByTitle).toBe('function');
    expect(typeof mockTopicRepository.findRecent).toBe('function');
    expect(typeof mockTopicRepository.incrementMessageCount).toBe('function');
    expect(typeof mockTopicRepository.updatePreview).toBe('function');
  });
  
  // 其他接口测试...
});
```

### 验证方法
- **代码审查**：确保接口设计符合需求
- **单元测试**：测试接口定义的完整性

### 完成标准
- 接口定义完整，包含所有必需的方法
- 单元测试通过，覆盖率100%

## 2. 实现话题存储库

### 任务描述
实现话题存储库，提供话题的CRUD操作和特定查询方法。

### 具体步骤
1. 创建`src/repositories/TopicRepository.ts`文件
2. 实现`ITopicRepository`接口
3. 使用`IDatabaseService`执行数据库操作

### 代码示例
```typescript
// src/repositories/TopicRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { ITopicRepository } from './interfaces';
import { Topic } from '../models';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

export class TopicRepository implements ITopicRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Topic | null> {
    try {
      return await this.db.get<Topic>(
        'SELECT * FROM topics WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find topic by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<Topic[]> {
    try {
      return await this.db.query<Topic>(
        'SELECT * FROM topics ORDER BY updated_at DESC'
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(topic: Omit<Topic, 'id'>): Promise<Topic> {
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const newTopic: Topic = {
        id,
        ...topic,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
        preview: topic.preview || ''
      };
      
      await this.db.execute(
        `INSERT INTO topics (
          id, title, created_at, updated_at, 
          last_model_id, last_provider_id, message_count, preview
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newTopic.id,
          newTopic.title,
          newTopic.createdAt,
          newTopic.updatedAt,
          newTopic.lastModelId || null,
          newTopic.lastProviderId || null,
          newTopic.messageCount,
          newTopic.preview
        ]
      );
      
      return newTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async update(id: string, topic: Partial<Topic>): Promise<Topic> {
    try {
      const currentTopic = await this.findById(id);
      if (!currentTopic) {
        throw new Error(`Topic with id ${id} not found`);
      }
      
      const updatedTopic = {
        ...currentTopic,
        ...topic,
        id, // 确保ID不变
        updatedAt: new Date().toISOString()
      };
      
      await this.db.execute(
        `UPDATE topics SET 
          title = ?, updated_at = ?, last_model_id = ?, 
          last_provider_id = ?, message_count = ?, preview = ?
        WHERE id = ?`,
        [
          updatedTopic.title,
          updatedTopic.updatedAt,
          updatedTopic.lastModelId || null,
          updatedTopic.lastProviderId || null,
          updatedTopic.messageCount,
          updatedTopic.preview || '',
          id
        ]
      );
      
      return updatedTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM topics WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete topic: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM topics'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTitle(title: string): Promise<Topic[]> {
    try {
      return await this.db.query<Topic>(
        'SELECT * FROM topics WHERE title LIKE ? ORDER BY updated_at DESC',
        [`%${title}%`]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find topics by title: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findRecent(limit: number): Promise<Topic[]> {
    try {
      return await this.db.query<Topic>(
        'SELECT * FROM topics ORDER BY updated_at DESC LIMIT ?',
        [limit]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find recent topics: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async incrementMessageCount(id: string): Promise<Topic> {
    try {
      await this.db.execute(
        'UPDATE topics SET message_count = message_count + 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
      
      const updatedTopic = await this.findById(id);
      if (!updatedTopic) {
        throw new Error(`Topic with id ${id} not found after incrementing message count`);
      }
      
      return updatedTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to increment message count: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async updatePreview(id: string, preview: string): Promise<Topic> {
    try {
      await this.db.execute(
        'UPDATE topics SET preview = ?, updated_at = ? WHERE id = ?',
        [preview, new Date().toISOString(), id]
      );
      
      const updatedTopic = await this.findById(id);
      if (!updatedTopic) {
        throw new Error(`Topic with id ${id} not found after updating preview`);
      }
      
      return updatedTopic;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update preview: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}
```

### 测试方法
```typescript
// src/repositories/__tests__/TopicRepository.test.ts
import { TopicRepository } from '../TopicRepository';
import { IDatabaseService } from '../../services/database/interfaces';
import { Topic } from '../../models';

// 创建模拟数据库服务
const mockDb: jest.Mocked<IDatabaseService> = {
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

describe('TopicRepository', () => {
  let repository: TopicRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TopicRepository(mockDb);
  });
  
  it('should find topic by id', async () => {
    const mockTopic: Topic = {
      id: '123',
      title: 'Test Topic',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      messageCount: 0,
      preview: ''
    };
    
    mockDb.get.mockResolvedValue(mockTopic);
    
    const result = await repository.findById('123');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM topics WHERE id = ?',
      ['123']
    );
    expect(result).toEqual(mockTopic);
  });
  
  it('should find all topics', async () => {
    const mockTopics: Topic[] = [
      {
        id: '123',
        title: 'Test Topic 1',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        messageCount: 0,
        preview: ''
      },
      {
        id: '456',
        title: 'Test Topic 2',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
        messageCount: 0,
        preview: ''
      }
    ];
    
    mockDb.query.mockResolvedValue(mockTopics);
    
    const result = await repository.findAll();
    
    expect(mockDb.query).toHaveBeenCalledWith(
      'SELECT * FROM topics ORDER BY updated_at DESC'
    );
    expect(result).toEqual(mockTopics);
  });
  
  it('should create a new topic', async () => {
    const topicToCreate = {
      title: 'New Topic',
      preview: 'Preview text'
    };
    
    mockDb.execute.mockResolvedValue();
    
    // 使用正则表达式匹配UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const result = await repository.create(topicToCreate as any);
    
    expect(mockDb.execute).toHaveBeenCalled();
    expect(result.id).toMatch(uuidRegex);
    expect(result.title).toBe(topicToCreate.title);
    expect(result.preview).toBe(topicToCreate.preview);
    expect(result.messageCount).toBe(0);
    expect(new Date(result.createdAt)).toBeInstanceOf(Date);
    expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
  });
  
  // 更多测试...
});
```

### 验证方法
- **单元测试**：测试所有CRUD操作
- **集成测试**：验证与数据库的交互
- **性能测试**：测量基本操作的性能

### 完成标准
- 实现了`ITopicRepository`接口的所有方法
- 单元测试通过，覆盖率不低于90%
- 集成测试验证了与数据库的正确交互

## 3. 实现消息存储库

### 任务描述
实现消息存储库，提供消息的CRUD操作和特定查询方法。

### 具体步骤
1. 创建`src/repositories/MessageRepository.ts`文件
2. 实现`IMessageRepository`接口
3. 使用`IDatabaseService`执行数据库操作

### 代码示例
```typescript
// src/repositories/MessageRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { IMessageRepository } from './interfaces';
import { Message } from '../models';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

export class MessageRepository implements IMessageRepository {
  constructor(private db: IDatabaseService) {}
  
  async findById(id: string): Promise<Message | null> {
    try {
      return await this.db.get<Message>(
        'SELECT * FROM messages WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find message by id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findAll(): Promise<Message[]> {
    try {
      return await this.db.query<Message>(
        'SELECT * FROM messages ORDER BY timestamp DESC'
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find all messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async create(message: Omit<Message, 'id'>): Promise<Message> {
    try {
      const id = crypto.randomUUID();
      
      const newMessage: Message = {
        id,
        ...message
      };
      
      await this.db.execute(
        `INSERT INTO messages (
          id, topic_id, role, content, timestamp, model_id, provider_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newMessage.id,
          newMessage.topicId,
          newMessage.role,
          newMessage.content,
          newMessage.timestamp,
          newMessage.modelId || null,
          newMessage.providerId || null
        ]
      );
      
      return newMessage;
    } catch (error) {
      throw new DatabaseError(
        `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async update(id: string, message: Partial<Message>): Promise<Message> {
    try {
      const currentMessage = await this.findById(id);
      if (!currentMessage) {
        throw new Error(`Message with id ${id} not found`);
      }
      
      const updatedMessage = {
        ...currentMessage,
        ...message,
        id // 确保ID不变
      };
      
      await this.db.execute(
        `UPDATE messages SET 
          topic_id = ?, role = ?, content = ?, timestamp = ?, 
          model_id = ?, provider_id = ?
        WHERE id = ?`,
        [
          updatedMessage.topicId,
          updatedMessage.role,
          updatedMessage.content,
          updatedMessage.timestamp,
          updatedMessage.modelId || null,
          updatedMessage.providerId || null,
          id
        ]
      );
      
      return updatedMessage;
    } catch (error) {
      throw new DatabaseError(
        `Failed to update message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM messages WHERE id = ?',
        [id]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async count(): Promise<number> {
    try {
      const result = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM messages'
      );
      return result?.count || 0;
    } catch (error) {
      throw new DatabaseError(
        `Failed to count messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTopicId(topicId: string): Promise<Message[]> {
    try {
      return await this.db.query<Message>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp ASC',
        [topicId]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find messages by topic id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByTopicIdPaginated(topicId: string, page: number, pageSize: number): Promise<Message[]> {
    try {
      const offset = (page - 1) * pageSize;
      
      return await this.db.query<Message>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?',
        [topicId, pageSize, offset]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find paginated messages: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findLastByTopicId(topicId: string): Promise<Message | null> {
    try {
      return await this.db.get<Message>(
        'SELECT * FROM messages WHERE topic_id = ? ORDER BY timestamp DESC LIMIT 1',
        [topicId]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find last message: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async deleteByTopicId(topicId: string): Promise<void> {
    try {
      await this.db.execute(
        'DELETE FROM messages WHERE topic_id = ?',
        [topicId]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to delete messages by topic id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}
```

### 测试方法
```typescript
// src/repositories/__tests__/MessageRepository.test.ts
import { MessageRepository } from '../MessageRepository';
import { IDatabaseService } from '../../services/database/interfaces';
import { Message } from '../../models';

// 创建模拟数据库服务
const mockDb: jest.Mocked<IDatabaseService> = {
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

describe('MessageRepository', () => {
  let repository: MessageRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MessageRepository(mockDb);
  });
  
  it('should find message by id', async () => {
    const mockMessage: Message = {
      id: '123',
      topicId: 'topic-1',
      role: 'user',
      content: 'Hello',
      timestamp: '2023-01-01T00:00:00Z'
    };
    
    mockDb.get.mockResolvedValue(mockMessage);
    
    const result = await repository.findById('123');
    
    expect(mockDb.get).toHaveBeenCalledWith(
      'SELECT * FROM messages WHERE id = ?',
      ['123']
    );
    expect(result).toEqual(mockMessage);
  });
  
  // 更多测试...
});
```

### 验证方法
- **单元测试**：测试所有CRUD操作
- **集成测试**：验证与数据库的交互
- **性能测试**：测量基本操作的性能

### 完成标准
- 实现了`IMessageRepository`接口的所有方法
- 单元测试通过，覆盖率不低于90%
- 集成测试验证了与数据库的正确交互

## 4. 实现模型和提供商存储库

### 任务描述
实现模型和提供商存储库，提供相应的CRUD操作和特定查询方法。

### 具体步骤
1. 创建`src/repositories/ProviderRepository.ts`文件
2. 创建`src/repositories/ModelRepository.ts`文件
3. 实现相应的存储库接口

### 代码示例
```typescript
// src/repositories/ProviderRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { IRepository } from './interfaces';
import { Provider } from '../models';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

export class ProviderRepository implements IRepository<Provider, string> {
  constructor(private db: IDatabaseService) {}
  
  // 实现IRepository接口的方法
  // ...
  
  // 特定方法
  async findByName(name: string): Promise<Provider | null> {
    try {
      return await this.db.get<Provider>(
        'SELECT * FROM providers WHERE name = ?',
        [name]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find provider by name: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findEnabled(): Promise<Provider[]> {
    try {
      return await this.db.query<Provider>(
        'SELECT * FROM providers WHERE enabled = 1'
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find enabled providers: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
}

// src/repositories/ModelRepository.ts
import { IDatabaseService } from '../services/database/interfaces';
import { IRepository } from './interfaces';
import { Model } from '../models';
import { DatabaseError, DatabaseErrorType } from '../services/database/interfaces';

export class ModelRepository implements IRepository<Model, string> {
  constructor(private db: IDatabaseService) {}
  
  // 实现IRepository接口的方法
  // ...
  
  // 特定方法
  async findByProviderId(providerId: string): Promise<Model[]> {
    try {
      return await this.db.query<Model>(
        'SELECT * FROM models WHERE provider_id = ?',
        [providerId]
      );
    } catch (error) {
      throw new DatabaseError(
        `Failed to find models by provider id: ${error instanceof Error ? error.message : String(error)}`,
        DatabaseErrorType.QUERY_ERROR
      );
    }
  }
  
  async findByGroupId(groupId: string): Promise<Model[]> {
    try {
      return await this.db.query<Model>(
        'SELECT * FROM models WHERE group_id =
