/**
 * 数据库映射工具函数
 * 用于处理数据库层（下划线命名法）和接口层（驼峰命名法）之间的映射
 */

import { AiModelProvider, AiModel, Topic, Message } from '../models/chat';

/**
 * 将数据库格式的提供商对象映射为接口格式
 * @param dbProvider 数据库格式的提供商对象
 * @returns 接口格式的提供商对象
 */
export function mapProviderFromDb(dbProvider: any): AiModelProvider | null {
  if (!dbProvider) return null;
  
  return {
    id: dbProvider.id,
    name: dbProvider.name,
    enabled: Boolean(dbProvider.enabled),
    apiUrl: dbProvider.api_url,
    apiKey: dbProvider.api_key,
    config: dbProvider.config ? (typeof dbProvider.config === 'string' ? JSON.parse(dbProvider.config) : dbProvider.config) : {},
    createdAt: dbProvider.created_at ? new Date(dbProvider.created_at) : undefined,
    updatedAt: dbProvider.updated_at ? new Date(dbProvider.updated_at) : undefined
  };
}

/**
 * 将接口格式的提供商对象映射为数据库格式
 * @param provider 接口格式的提供商对象
 * @returns 数据库格式的提供商对象
 */
export function mapProviderToDb(provider: Partial<AiModelProvider>): any {
  const dbProvider: any = {};
  
  if (provider.id !== undefined) dbProvider.id = provider.id;
  if (provider.name !== undefined) dbProvider.name = provider.name;
  if (provider.enabled !== undefined) dbProvider.enabled = provider.enabled ? 1 : 0;
  if (provider.apiUrl !== undefined) dbProvider.api_url = provider.apiUrl;
  if (provider.apiKey !== undefined) dbProvider.api_key = provider.apiKey;
  if (provider.config !== undefined) dbProvider.config = JSON.stringify(provider.config);
  if (provider.createdAt !== undefined) dbProvider.created_at = provider.createdAt.toISOString();
  if (provider.updatedAt !== undefined) dbProvider.updated_at = provider.updatedAt.toISOString();
  
  return dbProvider;
}

/**
 * 将数据库格式的模型对象映射为接口格式
 * @param dbModel 数据库格式的模型对象
 * @returns 接口格式的模型对象
 */
export function mapModelFromDb(dbModel: any): AiModel | null {
  if (!dbModel) return null;
  
  return {
    id: dbModel.id,
    name: dbModel.name,
    providerId: dbModel.provider_id,
    groupId: dbModel.group_id,
    capabilities: dbModel.capabilities ? (typeof dbModel.capabilities === 'string' ? JSON.parse(dbModel.capabilities) : dbModel.capabilities) : [],
    modelId: dbModel.model_id,
    contextWindow: dbModel.context_window,
    maxTokens: dbModel.max_tokens,
    config: dbModel.config ? (typeof dbModel.config === 'string' ? JSON.parse(dbModel.config) : dbModel.config) : {},
    createdAt: dbModel.created_at ? new Date(dbModel.created_at) : undefined,
    updatedAt: dbModel.updated_at ? new Date(dbModel.updated_at) : undefined
  };
}

/**
 * 将接口格式的模型对象映射为数据库格式
 * @param model 接口格式的模型对象
 * @returns 数据库格式的模型对象
 */
export function mapModelToDb(model: Partial<AiModel>): any {
  console.log('mapModelToDb - 输入模型:', model);
  console.log('mapModelToDb - modelId:', model.modelId);
  console.log('mapModelToDb - modelId 类型:', typeof model.modelId);
  
  const dbModel: any = {};
  
  if (model.id !== undefined) dbModel.id = model.id;
  if (model.name !== undefined) dbModel.name = model.name;
  if (model.providerId !== undefined) dbModel.provider_id = model.providerId;
  if (model.groupId !== undefined) dbModel.group_id = model.groupId;
  if (model.capabilities !== undefined) dbModel.capabilities = JSON.stringify(model.capabilities);
  if (model.modelId !== undefined) {
    console.log('mapModelToDb - 设置 model_id:', model.modelId);
    dbModel.model_id = model.modelId;
  } else {
    console.log('mapModelToDb - modelId 未定义');
  }
  if (model.contextWindow !== undefined) dbModel.context_window = model.contextWindow;
  if (model.maxTokens !== undefined) dbModel.max_tokens = model.maxTokens;
  if (model.config !== undefined) dbModel.config = JSON.stringify(model.config);
  if (model.createdAt !== undefined) dbModel.created_at = model.createdAt.toISOString();
  if (model.updatedAt !== undefined) dbModel.updated_at = model.updatedAt.toISOString();
  
  console.log('mapModelToDb - 输出数据库模型:', dbModel);
  console.log('mapModelToDb - 输出 model_id:', dbModel.model_id);
  console.log('mapModelToDb - 输出 model_id 类型:', typeof dbModel.model_id);
  
  return dbModel;
}

/**
 * 将数据库格式的话题对象映射为接口格式
 * @param dbTopic 数据库格式的话题对象
 * @returns 接口格式的话题对象
 */
export function mapTopicFromDb(dbTopic: any): Topic | null {
  if (!dbTopic) return null;
  
  // 处理消息计数，确保它是数字类型
  let messageCount = 0;
  if (dbTopic.message_count !== undefined) {
    messageCount = typeof dbTopic.message_count === 'string' 
      ? parseInt(dbTopic.message_count, 10) || 0 
      : dbTopic.message_count;
  } else if (dbTopic.messageCount !== undefined) {
    messageCount = typeof dbTopic.messageCount === 'string' 
      ? parseInt(dbTopic.messageCount, 10) || 0 
      : dbTopic.messageCount;
  }
  
  // 处理currentConfig，确保它是对象类型
  let currentConfig = null;
  if (dbTopic.current_config) {
    try {
      currentConfig = typeof dbTopic.current_config === 'string'
        ? JSON.parse(dbTopic.current_config)
        : dbTopic.current_config;
    } catch (e) {
      console.error('解析current_config失败:', e);
      currentConfig = {};
    }
  }
  
  return {
    id: dbTopic.id,
    title: dbTopic.title,
    createdAt: dbTopic.created_at,
    updatedAt: dbTopic.updated_at,
    lastModelId: dbTopic.last_model_id,
    lastProviderId: dbTopic.last_provider_id,
    messageCount: messageCount,
    preview: dbTopic.preview,
    sourceAssistantId: dbTopic.source_assistant_id,
    currentConfig: currentConfig
  };
}

/**
 * 将接口格式的话题对象映射为数据库格式
 * @param topic 接口格式的话题对象
 * @returns 数据库格式的话题对象
 */
export function mapTopicToDb(topic: Partial<Topic>): any {
  const dbTopic: any = {};
  
  if (topic.id !== undefined) dbTopic.id = topic.id;
  if (topic.title !== undefined) dbTopic.title = topic.title;
  if (topic.createdAt !== undefined) dbTopic.created_at = topic.createdAt;
  if (topic.updatedAt !== undefined) dbTopic.updated_at = topic.updatedAt;
  if (topic.lastModelId !== undefined) dbTopic.last_model_id = topic.lastModelId;
  if (topic.lastProviderId !== undefined) dbTopic.last_provider_id = topic.lastProviderId;
  if (topic.messageCount !== undefined) dbTopic.message_count = topic.messageCount;
  if (topic.preview !== undefined) dbTopic.preview = topic.preview;
  
  // 添加sourceAssistantId和currentConfig字段
  if (topic.sourceAssistantId !== undefined) dbTopic.source_assistant_id = topic.sourceAssistantId;
  if (topic.currentConfig !== undefined) dbTopic.current_config = JSON.stringify(topic.currentConfig);
  
  console.log('mapTopicToDb - 输出数据库话题:', dbTopic);
  
  return dbTopic;
}

/**
 * 将数据库格式的消息对象映射为接口格式
 * @param dbMessage 数据库格式的消息对象
 * @returns 接口格式的消息对象
 */
export function mapMessageFromDb(dbMessage: any): Message | null {
  if (!dbMessage) return null;
  
  console.log('mapMessageFromDb - 输入消息:', dbMessage);
  
  return {
    id: dbMessage.id,
    topicId: dbMessage.topic_id || dbMessage.topicId,
    role: dbMessage.role,
    content: dbMessage.content,
    timestamp: dbMessage.timestamp,
    modelId: dbMessage.model_id || dbMessage.modelId,
    providerId: dbMessage.provider_id || dbMessage.providerId
  };
}

/**
 * 将接口格式的消息对象映射为数据库格式
 * @param message 接口格式的消息对象
 * @returns 数据库格式的消息对象
 */
export function mapMessageToDb(message: Partial<Message>): any {
  const dbMessage: any = {};
  
  console.log('mapMessageToDb - 输入消息:', message);
  
  if (message.id !== undefined) dbMessage.id = message.id;
  if (message.topicId !== undefined) dbMessage.topic_id = message.topicId;
  if (message.role !== undefined) dbMessage.role = message.role;
  if (message.content !== undefined) dbMessage.content = message.content;
  if (message.timestamp !== undefined) dbMessage.timestamp = message.timestamp;
  if (message.modelId !== undefined) dbMessage.model_id = message.modelId;
  if (message.providerId !== undefined) dbMessage.provider_id = message.providerId;
  
  console.log('mapMessageToDb - 输出消息:', dbMessage);
  
  return dbMessage;
} 