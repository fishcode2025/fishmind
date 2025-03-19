export interface Topic {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastModelId?: string;
  lastProviderId?: string;
  messageCount: number;
  preview?: string;
  sourceAssistantId?: string;
  currentConfig?: {
    providerId?: string;
    modelId?: string;
    systemPrompt?: string;
    temperature?: number;
    memoryStrategy?: string;
    contextWindowSize?: number;
    enabledToolIds?: string[];
    knowledgeBaseIds?: string[];
  };
  
  // 以下是新增的可选字段
  providerId?: string;            // AI提供商ID
  modelId?: string;               // 模型ID
  description?: string;           // 助手描述
  temperature?: number;           // 温度参数，控制回答的随机性 (0.0-2.0)
}

export interface Message {
  id: string;
  topicId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelId?: string;
  providerId?: string;
}

/**
 * AI模型提供商
 */
export interface AiModelProvider {
  id: string;
  name: string;
  enabled: boolean;
  apiUrl: string;
  apiKey?: string;
  config?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * AI模型
 */
export interface AiModel {
  id: string;
  name: string;
  providerId: string;
  groupId: string;
  capabilities: string[];
  modelId: string; // 模型在API中的标识符
  contextWindow: number; // 上下文窗口大小（令牌数）
  maxTokens: number; // 最大输出令牌数
  config?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * 知识库模型 - 第二阶段实现
 */
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  
  // 知识库类型和来源
  type: 'document' | 'website' | 'database' | 'custom'; // 知识库类型
  sourceType: 'file' | 'folder' | 'url' | 'text';      // 来源类型
  sourcePath?: string;           // 来源路径或URL
  
  // 索引和检索设置
  indexType: 'vector' | 'keyword' | 'hybrid';
  embeddingModelId?: string;
  chunkSize: number;
  chunkOverlap: number;
  
  // 检索设置
  retrievalStrategy: 'similarity' | 'mmr' | 'custom';
  topK: number;
  
  // 元数据
  documentCount: number;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ready' | 'indexing' | 'error'; // 知识库状态
}


/**
 * 工具模型 - 第二阶段实现
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  icon?: string;
  
  // 工具类型和功能
  type: 'web_search' | 'code_interpreter' | 'image_generation' | 
        'file_operation' | 'api_call' | 'custom_function';
  
  // 工具配置
  config: {
    // 通用配置
    enabled: boolean;
    requiresConfirmation: boolean; // 使用前是否需要确认
    
    // 特定工具的配置参数
    [key: string]: any;          // 不同工具的特定配置
  };
  
  // 工具定义
  definition: {
    // 函数定义
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
  
  // 权限和限制
  permissions: {
    requiresInternet: boolean;   // 是否需要互联网访问
    canAccessFiles: boolean;     // 是否可以访问文件系统
    canExecuteCode: boolean;     // 是否可以执行代码
    maxExecutionTime?: number;   // 最大执行时间（毫秒）
  };
  
  // 元数据
  createdAt: string;
  updatedAt: string;
  isBuiltIn: boolean;
}

/**
 * 助手模型 - 作为话题的模板，提供默认配置
 */
export interface Assistant {
  id: string;                    // 唯一标识符
  name: string;                  // 助手名称
  description?: string;           // 助手描述
  avatar?: string;               // 头像URL或路径
  
  // 关联的模型和提供商
  providerId?: string;            // AI提供商ID
  modelId?: string;               // 模型ID
  
  // 系统提示词和行为设置
  systemPrompt: string;          // 系统提示词，定义助手的角色和行为
  temperature?: number;           // 温度参数，控制回答的随机性 (0.0-2.0)
  
  // 上下文记忆设置 (第二阶段实现)
  memoryStrategy?: 'simple' | 'summarize' | 'selective';  // 记忆策略
  contextWindowSize?: number;    // 自定义上下文窗口大小，可选
  
  // 关联的工具和知识库 (第二阶段实现)
  enabledToolIds?: string[];      // 启用的工具ID列表
  knowledgeBaseIds?: string[];    // 关联的知识库ID列表
  
  // 元数据
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
  isDefault?: boolean;           // 是否为默认助手
  tags?: string[];               // 标签，用于分类
}