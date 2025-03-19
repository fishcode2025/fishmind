// src/repositories/interfaces.ts
import { Topic, Message, AiModelProvider, AiModel,Assistant } from '../models/chat';
import { Config, ConfigMetadata, ConfigChangeEvent } from '../models/config';
import { McpServerConfig, TransportType } from '../models/mcpTypes';

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
export interface ITopicRepository {
  findById(id: string): Promise<Topic | null>;
  findAll(): Promise<Topic[]>;
  findRecent(limit: number): Promise<Topic[]>;
  create(topic: Omit<Topic, 'id'>): Promise<Topic>;
  update(id: string, topic: Partial<Topic>): Promise<Topic>;
  delete(id: string): Promise<boolean>;
  findByTitle(query: string): Promise<Topic[]>;
  incrementMessageCount(id: string): Promise<void>;
  updatePreview(id: string, preview: string): Promise<void>;
  count(): Promise<number>;
  findByAssistantId(assistantId: string): Promise<Topic[]>; // 新增：根据助手ID查找话题
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

/**
 * 提供商存储库接口
 * 扩展通用存储库接口，添加提供商特定的方法
 */
export interface IProviderRepository extends IRepository<AiModelProvider, string> {
  /**
   * 根据名称查找提供商
   * @param name 提供商名称
   * @returns 找到的提供商或null
   */
  findByName(name: string): Promise<AiModelProvider | null>;
  
  /**
   * 查找所有启用的提供商
   * @returns 启用的提供商列表
   */
  findEnabled(): Promise<AiModelProvider[]>;
}

/**
 * 模型存储库接口
 * 扩展通用存储库接口，添加模型特定的方法
 */
export interface IModelRepository extends IRepository<AiModel, string> {
  /**
   * 根据提供商ID查找模型
   * @param providerId 提供商ID
   * @returns 该提供商下的所有模型
   */
  findByProviderId(providerId: string): Promise<AiModel[]>;
  
  /**
   * 根据组ID查找模型
   * @param groupId 组ID
   * @returns 该组下的所有模型
   */
  findByGroupId(groupId: string): Promise<AiModel[]>;
  
  /**
   * 根据能力查找模型
   * @param capability 能力名称
   * @returns 具有该能力的所有模型
   */
  findByCapability(capability: string): Promise<AiModel[]>;
}

/**
 * 配置存储库接口
 * 扩展通用存储库接口，添加配置特定的方法
 */
export interface IConfigRepository extends IRepository<Config, string> {
  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值或null
   */
  getValue(key: string): Promise<string | null>;
  
  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   * @returns 更新后的配置
   */
  setValue(key: string, value: string): Promise<Config>;

  /**
   * 根据分组获取配置
   * @param group 配置分组
   * @returns 该分组下的所有配置
   */
  findByGroup(group: string): Promise<Config[]>;
  
  /**
   * 批量设置配置
   * @param configs 配置键值对
   * @returns 更新后的配置列表
   */
  setValues(configs: Record<string, string>): Promise<Config[]>;
  
  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据或null
   */
  getMetadata(key: string): Promise<ConfigMetadata | null>;
  
  /**
   * 设置配置元数据
   * @param metadata 配置元数据
   * @returns 更新后的配置元数据
   */
  setMetadata(metadata: ConfigMetadata): Promise<ConfigMetadata>;
  
  /**
   * 获取所有配置元数据
   * @returns 所有配置元数据
   */
  getAllMetadata(): Promise<ConfigMetadata[]>;
  
  /**
   * 根据分组获取配置元数据
   * @param group 配置分组
   * @returns 该分组下的所有配置元数据
   */
  getMetadataByGroup(group: string): Promise<ConfigMetadata[]>;
  
  /**
   * 记录配置变更事件
   * @param event 配置变更事件
   * @returns 记录的配置变更事件
   */
  logChangeEvent(event: Omit<ConfigChangeEvent, 'id' | 'timestamp'>): Promise<ConfigChangeEvent>;
  
  /**
   * 获取配置变更历史
   * @param key 配置键
   * @param limit 限制数量
   * @returns 配置变更历史
   */
  getChangeHistory(key: string, limit?: number): Promise<ConfigChangeEvent[]>;
  
  /**
   * 获取类型安全的配置值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 类型安全的配置值或默认值
   */
  getTypedValue<T>(key: string, defaultValue: T): Promise<T>;
  
  /**
   * 设置类型安全的配置值
   * @param key 配置键
   * @param value 类型安全的值
   * @returns 更新后的配置
   */
  setTypedValue<T>(key: string, value: T): Promise<Config>;
  
  /**
   * 添加配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  addListener(key: string, callback: (value: string, oldValue: string | null) => void): void;
  
  /**
   * 移除配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  removeListener(key: string, callback: (value: string, oldValue: string | null) => void): void;
  
  /**
   * 迁移配置
   * @param fromVersion 源版本
   * @param toVersion 目标版本
   */
  migrateConfigs(fromVersion: string, toVersion: string): Promise<void>;
}

export interface IAssistantRepository {
  findById(id: string): Promise<Assistant | null>;
  findAll(): Promise<Assistant[]>;
  create(assistant: Omit<Assistant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assistant>;
  update(id: string, assistant: Partial<Assistant>): Promise<Assistant>;
  delete(id: string): Promise<boolean>;
  findByName(name: string): Promise<Assistant | null>;
  findDefault(): Promise<Assistant | null>;
  setDefault(id: string): Promise<boolean>;
  count(): Promise<number>;
}
// ... existing interfaces ...

export interface IMcpServerConfigRepository {
  // 基础CRUD操作
  findById(id: string): Promise<McpServerConfig | null>;
  findAll(): Promise<McpServerConfig[]>;
  create(config: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig>;
  update(id: string, config: Partial<McpServerConfig>): Promise<McpServerConfig>;
  delete(id: string): Promise<void>;

  // 特定查询方法
  findByName(name: string): Promise<McpServerConfig | null>;
  findByTransportType(type: TransportType): Promise<McpServerConfig[]>;
  listRecent(limit: number): Promise<McpServerConfig[]>;
}