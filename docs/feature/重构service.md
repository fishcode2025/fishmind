# 服务模块梳理与整改方案

## 现有服务模块分析

根据您提供的代码，我发现`@services`目录下有多个服务模块，它们各自负责不同的功能，但确实存在一些重叠和混乱的情况。以下是对这些服务的梳理：

### 1. 存储相关服务

#### 1.1 `storage`目录
- **StorageService**: 提供基本的本地存储功能，使用浏览器的localStorage
- **ChatTopicStorage**: 管理聊天话题的存储和检索，使用SQLite数据库
- **ChatMessageStorage**: 管理聊天消息的存储和检索，使用文件系统
- **types.ts**: 定义存储相关的类型和错误

#### 1.2 `defaultModel`目录
- **DefaultModelStorage**: 负责保存和加载默认模型配置，使用StorageService
- **DefaultModelService**: 管理默认模型配置

#### 1.3 `modelService`目录
- **ModelServiceStorage**: 持久化存储模型服务配置，使用localStorage

### 2. 模型相关服务

#### 2.1 `modelService`目录
- **ModelServiceManager**: 管理所有模型服务提供商
- **adapters/**: 包含各种模型提供商的适配器（OpenAI、Ollama、Silicon、Deepseek）
- **models/types.ts**: 定义模型相关的类型

### 3. 聊天相关服务

#### 3.1 `chatService`目录
- **ChatService**: 提供聊天功能，使用ModelServiceManager发送消息

### 4. 加密相关服务

#### 4.1 `encryption`目录
- **EncryptionService**: 负责数据加密和解密操作

### 5. 系统相关服务

#### 5.1 `system`目录
- **ConfigService**: 管理应用配置
- **DirectoryService**: 管理应用的目录结构

### 6. 测试相关服务

#### 6.1 `test`目录
- **ConfigTest**: 用于验证Tauri权限配置是否正确

### 7. 已删除的服务

#### 7.1 `mcpService`目录（已删除）
- 原提供MCP服务器的管理、工具调用和资源访问功能

## 问题分析

1. **存储逻辑分散**: 存储逻辑分散在多个服务中，有的使用localStorage，有的使用文件系统，有的使用SQLite
2. **职责不清**: 一些服务的职责边界不清晰，如DefaultModelStorage和ModelServiceStorage
3. **依赖关系复杂**: 服务之间的依赖关系复杂，如ChatService依赖ModelServiceManager
4. **代码重复**: 存在一些代码重复，如错误处理逻辑
5. **命名不一致**: 一些服务使用单例模式，一些不使用；一些导出实例，一些导出类

## 整改方案

### 1. 存储层重构

#### 1.1 统一存储接口
```typescript
// src/services/storage/interfaces.ts
export interface IStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface IFileStorage {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
}

export interface IDatabaseStorage {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}
```

#### 1.2 实现具体存储类
```typescript
// src/services/storage/LocalStorage.ts
export class LocalStorage implements IStorage {
  // 实现接口方法
}

// src/services/storage/FileStorage.ts
export class FileStorage implements IFileStorage {
  // 实现接口方法
}

// src/services/storage/DatabaseStorage.ts
export class DatabaseStorage implements IDatabaseStorage {
  // 实现接口方法
}
```

#### 1.3 创建存储工厂
```typescript
// src/services/storage/StorageFactory.ts
export class StorageFactory {
  static getLocalStorage(): IStorage {
    return new LocalStorage();
  }
  
  static getFileStorage(): IFileStorage {
    return new FileStorage();
  }
  
  static getDatabaseStorage(): IDatabaseStorage {
    return new DatabaseStorage();
  }
}
```

### 2. 服务层重构

#### 2.1 统一服务接口
```typescript
// src/services/interfaces.ts
export interface IService {
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}
```

#### 2.2 重构模型服务
```typescript
// src/services/model/ModelService.ts
export class ModelService implements IService {
  // 合并ModelServiceManager和DefaultModelService的功能
}
```

#### 2.3 重构聊天服务
```typescript
// src/services/chat/ChatService.ts
export class ChatService implements IService {
  // 使用新的存储接口
}
```

#### 2.4 重构配置服务
```typescript
// src/services/system/ConfigService.ts
export class ConfigService implements IService {
  // 使用新的存储接口
}
```

### 3. 数据模型重构

#### 3.1 统一数据模型
```typescript
// src/models/index.ts
export * from './chat';
export * from './model';
export * from './config';
```

### 4. 服务注册与依赖注入

#### 4.1 创建服务容器
```typescript
// src/services/ServiceContainer.ts
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
  }
}
```

#### 4.2 服务注册
```typescript
// src/services/index.ts
import { ServiceContainer } from './ServiceContainer';
import { ModelService } from './model/ModelService';
import { ChatService } from './chat/ChatService';
import { ConfigService } from './system/ConfigService';

// 注册服务
ServiceContainer.register('model', new ModelService());
ServiceContainer.register('chat', new ChatService());
ServiceContainer.register('config', new ConfigService());

// 导出服务获取方法
export function getModelService(): ModelService {
  return ServiceContainer.get('model');
}

export function getChatService(): ChatService {
  return ServiceContainer.get('chat');
}

export function getConfigService(): ConfigService {
  return ServiceContainer.get('config');
}

// 初始化所有服务
export async function initializeServices(): Promise<void> {
  await ServiceContainer.initialize();
}
```

### 5. 错误处理统一

#### 5.1 创建统一的错误类
```typescript
// src/errors/index.ts
export enum ErrorType {
  STORAGE_ERROR = 'STORAGE_ERROR',
  MODEL_ERROR = 'MODEL_ERROR',
  CHAT_ERROR = 'CHAT_ERROR',
  CONFIG_ERROR = 'CONFIG_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AppError extends Error {
  type: ErrorType;
  
  constructor(message: string, type: ErrorType = ErrorType.UNKNOWN_ERROR) {
    super(message);
    this.type = type;
    this.name = 'AppError';
  }
}
```

## 实施步骤

1. **创建新的目录结构**
   - 按照上述方案创建新的目录和文件

2. **逐步迁移现有功能**
   - 从最底层的存储接口开始实现
   - 然后实现服务层
   - 最后实现服务容器和依赖注入

3. **更新引用**
   - 更新应用中对服务的引用，使用新的服务获取方法

4. **测试**
   - 为每个服务编写单元测试
   - 进行集成测试确保服务之间的交互正常

5. **清理旧代码**
   - 在确认新代码正常工作后，删除旧的服务实现

## 总结

通过这次重构，我们将：

1. 统一存储接口，使不同的存储方式有一致的API
2. 明确服务的职责边界，减少重复代码
3. 简化服务之间的依赖关系，使用依赖注入
4. 统一错误处理，提高代码可维护性
5. 提供清晰的服务获取方法，避免直接使用单例

这样的架构更加清晰、可维护，也更容易进行单元测试。
