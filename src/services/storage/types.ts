/**
 * 聊天话题元数据
 */
export interface ChatTopic {
  id: string;                 // 唯一标识符
  title: string;              // 话题标题
  createdAt: string;          // 创建时间
  updatedAt: string;          // 最后更新时间
  lastModelId: string;        // 最后使用的模型ID
  lastProviderId: string;     // 最后使用的提供商ID
  messageCount: number;       // 消息数量
  preview: string;            // 预览内容
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string;                 // 消息ID
  topicId: string;            // 所属话题ID
  role: 'user' | 'assistant' | 'system'; // 消息角色
  content: string;            // 消息内容
  timestamp: string;          // 时间戳
  modelId?: string;           // 使用的模型ID（对于AI回复）
  providerId?: string;        // 使用的提供商ID（对于AI回复）
}

/**
 * 话题创建参数
 */
export interface CreateTopicParams {
  title: string;
  modelId: string;
  providerId: string;
  initialMessage?: string;
}

/**
 * 话题更新参数
 */
export interface UpdateTopicParams {
  title?: string;
  lastModelId?: string;
  lastProviderId?: string;
}

/**
 * 消息创建参数
 */
export interface CreateMessageParams {
  topicId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  providerId?: string;
}

/**
 * 存储服务错误类型
 */
export enum StorageErrorType {
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 存储服务错误
 */
export class StorageError extends Error {
  type: StorageErrorType;
  
  constructor(message: string, type: StorageErrorType = StorageErrorType.UNKNOWN_ERROR) {
    super(message);
    this.type = type;
    this.name = 'StorageError';
  }
} 