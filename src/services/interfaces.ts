/**
 * 服务层接口定义
 * 提供统一的服务接口规范
 */
import {
  McpServerConfig,
  TransportType,
  ClientStatusResponse,
} from "@/models/mcpTypes";
import {
  Topic,
  Message,
  AiModelProvider,
  AiModel,
  Assistant,
} from "../models/chat";
import { Config, ConfigMetadata, ConfigChangeEvent } from "../models/config";
import {
  ToolInfo,
  ResourceInfo,
  PromptInfo,
  McpResponse,
  FilterRequest,
} from "../models/mcpToolTypes";

/**
 * 基础服务接口
 * 所有服务都应实现此接口
 */
export interface IService {
  /**
   * 初始化服务
   * 在应用启动时调用
   */
  initialize(): Promise<void>;

  /**
   * 释放服务资源
   * 在应用关闭时调用
   */
  dispose(): Promise<void>;
}

/**
 * 配置服务接口
 * 负责管理应用配置，包括数据库位置设置
 */
export interface IConfigService extends IService {
  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值或null（如果不存在）
   */
  getValue(key: string): Promise<string | null>;

  /**
   * 设置配置值
   * @param key 配置键
   * @param value 配置值
   */
  setValue(key: string, value: string): Promise<void>;

  /**
   * 获取类型安全的配置值
   * @param key 配置键
   * @param defaultValue 默认值（如果配置不存在）
   * @returns 类型安全的配置值
   */
  getTypedValue<T>(key: string, defaultValue: T): Promise<T>;

  /**
   * 设置类型安全的配置值
   * @param key 配置键
   * @param value 配置值
   */
  setTypedValue<T>(key: string, value: T): Promise<void>;

  /**
   * 获取配置元数据
   * @param key 配置键
   * @returns 配置元数据或null（如果不存在）
   */
  getMetadata(key: string): Promise<ConfigMetadata | null>;

  /**
   * 获取分组配置
   * @param group 配置分组
   * @returns 分组内的所有配置
   */
  getConfigsByGroup(group: string): Promise<Config[]>;

  /**
   * 获取分组元数据
   * @param group 配置分组
   * @returns 分组内的所有配置元数据
   */
  getMetadataByGroup(group: string): Promise<ConfigMetadata[]>;

  /**
   * 批量设置配置值
   * @param configs 配置键值对
   */
  setValues(configs: Record<string, string>): Promise<void>;

  /**
   * 添加配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  addListener(
    key: string,
    callback: (value: string, oldValue: string | null) => void
  ): void;

  /**
   * 移除配置变更监听器
   * @param key 配置键
   * @param callback 回调函数
   */
  removeListener(
    key: string,
    callback: (value: string, oldValue: string | null) => void
  ): void;

  /**
   * 获取数据库位置
   * @returns 数据库文件路径
   */
  getDatabaseLocation(): Promise<string>;

  /**
   * 设置数据库位置
   * @param location 数据库文件路径
   */
  setDatabaseLocation(location: string): Promise<void>;
}

/**
 * AI模型服务接口
 * 负责管理AI模型和提供商
 */
export interface IAiModelService extends IService {
  /**
   * 获取所有模型提供商
   * @returns 提供商列表
   */
  getAllProviders(): Promise<AiModelProvider[]>;

  /**
   * 获取启用的模型提供商
   * @returns 启用的提供商列表
   */
  getEnabledProviders(): Promise<AiModelProvider[]>;

  /**
   * 获取提供商详情
   * @param id 提供商ID
   * @returns 提供商详情或null（如果不存在）
   */
  getProvider(id: string): Promise<AiModelProvider | null>;

  /**
   * 添加模型提供商
   * @param provider 提供商信息（不包含ID）
   * @returns 创建的提供商
   */
  addProvider(
    provider: Omit<AiModelProvider, "id" | "createdAt" | "updatedAt">
  ): Promise<AiModelProvider>;

  /**
   * 更新模型提供商
   * @param id 提供商ID
   * @param data 要更新的字段
   * @returns 更新后的提供商
   */
  updateProvider(
    id: string,
    data: Partial<AiModelProvider>
  ): Promise<AiModelProvider>;

  /**
   * 删除模型提供商
   * @param id 提供商ID
   */
  deleteProvider(id: string): Promise<void>;

  /**
   * 获取所有AI模型
   * @returns 模型列表
   */
  getAllModels(): Promise<AiModel[]>;

  /**
   * 获取模型详情
   * @param id 模型ID
   * @returns 模型详情或null（如果不存在）
   */
  getModel(id: string): Promise<AiModel | null>;

  /**
   * 获取提供商下的所有模型
   * @param providerId 提供商ID
   * @returns 模型列表
   */
  getModelsByProvider(providerId: string): Promise<AiModel[]>;

  /**
   * 获取特定分组的模型
   * @param groupId 分组ID
   * @returns 模型列表
   */
  getModelsByGroup(groupId: string): Promise<AiModel[]>;

  /**
   * 获取具有特定能力的模型
   * @param capability 能力标识
   * @returns 模型列表
   */
  getModelsByCapability(capability: string): Promise<AiModel[]>;

  /**
   * 添加AI模型
   * @param model 模型信息（不包含ID）
   * @returns 创建的模型
   */
  addModel(
    model: Omit<AiModel, "id" | "createdAt" | "updatedAt">
  ): Promise<AiModel>;

  /**
   * 添加提供商的所有可用模型
   * @param providerId 提供商ID
   * @returns 添加的模型列表
   */
  addAllModels(providerId: string): Promise<AiModel[]>;

  /**
   * 更新AI模型
   * @param id 模型ID
   * @param data 要更新的字段
   * @returns 更新后的模型
   */
  updateModel(id: string, data: Partial<AiModel>): Promise<AiModel>;

  /**
   * 删除AI模型
   * @param id 模型ID
   */
  deleteModel(id: string): Promise<void>;

  // 测试提供商连接
  testProviderConnection(providerId: string): Promise<boolean>;

  // 使用提供商对象直接测试连接，无需先保存到数据库
  testProviderConnectionWithProvider(
    provider: AiModelProvider
  ): Promise<boolean>;

  // 从提供商API获取模型
  fetchModelsFromProvider(providerId: string): Promise<AiModel[]>;

  // 当前模型管理
  getCurrentModel(): Promise<{
    provider: AiModelProvider;
    model: AiModel;
  } | null>;
  setCurrentModel(model: AiModel): Promise<void>;

  // 获取默认模型
  getDefaultModel(): Promise<{
    provider: AiModelProvider;
    model: AiModel;
  } | null>;

  // 设置默认模型
  setDefaultModel(model: AiModel): Promise<void>;
}

/**
 * 聊天服务接口
 * 负责管理聊天话题和消息
 */
export interface IChatService {
  /**
   * 创建新话题
   * @param title 话题标题
   * @returns 创建的话题
   */
  createTopic(title: string): Promise<Topic>;

  /**
   * 获取所有话题
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 话题列表
   */
  getAllTopics(limit?: number, offset?: number): Promise<Topic[]>;

  /**
   * 获取话题详情
   * @param id 话题ID
   * @returns 话题详情或null（如果不存在）
   */
  getTopic(id: string): Promise<Topic | null>;

  /**
   * 搜索话题
   * @param query 搜索关键词
   * @returns 匹配的话题列表
   */
  searchTopics(query: string): Promise<Topic[]>;

  /**
   * 更新话题
   * @param id 话题ID
   * @param data 要更新的字段
   * @returns 更新后的话题
   */
  updateTopic(id: string, data: Partial<Topic>): Promise<Topic>;

  /**
   * 删除话题
   * @param id 话题ID
   */
  deleteTopic(id: string): Promise<void>;

  /**
   * 获取话题消息
   * @param topicId 话题ID
   * @returns 消息列表
   */
  getMessages(topicId: string): Promise<Message[]>;

  /**
   * 发送用户消息
   * @param topicId 话题ID
   * @param content 消息内容
   * @returns 创建的消息
   */
  sendMessage(topicId: string, content: string): Promise<Message>;

  /**
   * 发送系统消息
   * @param topicId 话题ID
   * @param content 消息内容
   * @returns 创建的消息
   */
  sendSystemMessage(topicId: string, content: string): Promise<Message>;

  /**
   * 删除消息
   * @param id 消息ID
   */
  deleteMessage(id: string): Promise<void>;

  /**
   * 生成AI回复
   * @param topicId 话题ID
   * @param modelId 模型ID（可选）
   * @param providerId 提供商ID（可选）
   * @returns 生成的回复消息
   */
  // generateAiReply(topicId: string, modelId?: string, providerId?: string): Promise<Message>;

  /**
   * 添加流式回复方法
   * @param topicId 话题ID
   * @param onEvent 接收流事件的回调函数
   * @param modelId 模型ID（可选）
   * @param providerId 提供商ID（可选）
   * @returns 生成的回复消息
   */
  generateAiReplyStream(
    topicId: string,
    onEvent: (event: any) => void,
    modelId?: string,
    providerId?: string
  ): Promise<Message>;

  /**
   * 获取话题统计信息
   * @returns 话题总数
   */
  getTopicStats(): Promise<{ total: number; today: number }>;
  // 助手相关方法
  getAllAssistants(): Promise<Assistant[]>;
  getAssistant(id: string): Promise<Assistant | null>;
  createAssistant(
    assistant: Omit<Assistant, "id" | "createdAt" | "updatedAt">
  ): Promise<Assistant>;
  updateAssistant(id: string, data: Partial<Assistant>): Promise<Assistant>;
  deleteAssistant(id: string): Promise<void>;
  getDefaultAssistant(): Promise<Assistant | null>;
  setDefaultAssistant(id: string): Promise<void>;
  createTopicFromAssistant(assistantId: string, title?: string): Promise<Topic>;
  createAssistantFromTopic(
    topicId: string,
    name: string,
    description?: string
  ): Promise<Assistant>;
  getAssistantStats(): Promise<{ total: number }>;
  duplicateAssistant(id: string, newName?: string): Promise<Assistant>;
  exportAssistant(id: string): Promise<string>;
  importAssistant(configJson: string): Promise<Assistant>;
}

/**
 * MCP服务接口
 * 负责管理MCP服务器配置
 */
export interface IMcpService extends IService {
  /**
   * 获取所有MCP服务器配置
   * @returns 配置列表
   */
  getAllConfigs(): Promise<McpServerConfig[]>;
  getConfig(id: string): Promise<McpServerConfig | null>;
  createConfig(config: Omit<McpServerConfig, "id">): Promise<McpServerConfig>;
  updateConfig(
    id: string,
    config: Partial<McpServerConfig>
  ): Promise<McpServerConfig>;
  deleteConfig(id: string): Promise<void>;
  getConfigByName(name: string): Promise<McpServerConfig | null>;
  getConfigByTransportType(type: TransportType): Promise<McpServerConfig[]>;
  listRecentConfigs(limit: number): Promise<McpServerConfig[]>;

  /**
   * 获取指定服务器的状态
   * @param configId 配置ID
   * @returns 服务器状态
   */
  getServerStatus(configId: string): Promise<ClientStatusResponse>;

  /**
   * 获取所有服务器的状态
   * @returns 所有服务器状态的映射
   */
  getAllServerStatuses(): Promise<Record<string, ClientStatusResponse>>;
}

/**
 * MCP工具服务接口
 * 负责管理与MCP工具、资源和提示相关的操作
 */
export interface IMcpToolService extends IService {
  /**
   * 列出指定MCP客户端提供的工具
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 工具列表
   */
  listTools(
    configId: string,
    filter?: Record<string, any>
  ): Promise<ToolInfo[]>;

  /**
   * 调用指定MCP客户端的工具
   * @param configId MCP客户端配置ID
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具调用结果
   */
  callTool(
    configId: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<any>;

  /**
   * 列出指定MCP客户端提供的资源
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 资源列表
   */
  listResources(
    configId: string,
    filter?: Record<string, any>
  ): Promise<ResourceInfo[]>;

  /**
   * 读取指定MCP客户端的资源
   * @param configId MCP客户端配置ID
   * @param resourceUri 资源URI
   * @returns 资源内容
   */
  readResource(configId: string, resourceUri: string): Promise<any>;

  /**
   * 列出指定MCP客户端提供的提示
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 提示列表
   */
  listPrompts(
    configId: string,
    filter?: Record<string, any>
  ): Promise<PromptInfo[]>;

  /**
   * 获取指定MCP客户端的提示
   * @param configId MCP客户端配置ID
   * @param promptName 提示名称
   * @param params 提示参数
   * @returns 提示内容
   */
  getPrompt(
    configId: string,
    promptName: string,
    params: Record<string, any>
  ): Promise<any>;

  /**
   * 获取指定MCP客户端的所有可用工具
   * @returns 按客户端ID分组的工具映射
   */
  getAllAvailableTools(): Promise<Record<string, ToolInfo[]>>;

  /**
   * 获取指定MCP客户端的所有可用资源
   * @returns 按客户端ID分组的资源映射
   */
  getAllAvailableResources(): Promise<Record<string, ResourceInfo[]>>;

  /**
   * 获取指定MCP客户端的所有可用提示
   * @returns 按客户端ID分组的提示映射
   */
  getAllAvailablePrompts(): Promise<Record<string, PromptInfo[]>>;

  /**
   * 刷新指定MCP客户端的工具列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的工具列表
   */
  refreshTools(configId: string): Promise<ToolInfo[]>;

  /**
   * 刷新指定MCP客户端的资源列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的资源列表
   */
  refreshResources(configId: string): Promise<ResourceInfo[]>;

  /**
   * 刷新指定MCP客户端的提示列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的提示列表
   */
  refreshPrompts(configId: string): Promise<PromptInfo[]>;
}
