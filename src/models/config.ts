/**
 * 配置项接口
 * 定义了应用配置的数据结构
 */
export interface Config {
  /**
   * 配置键（唯一标识符）
   */
  key: string;
  
  /**
   * 配置值（JSON 字符串）
   */
  value: string;
  
  /**
   * 更新时间
   */
  updatedAt: string;
  
  /**
   * 配置分组（可选）
   * 用于对配置进行分类，如 'system', 'appearance', 'network' 等
   */
  groupName?: string;
  
  /**
   * 配置描述（可选）
   * 用于说明配置的用途
   */
  description?: string;
}

/**
 * 配置类型枚举
 * 定义了支持的配置值类型
 */
export enum ConfigValueType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array'
}

/**
 * 配置元数据接口
 * 定义了配置的元信息，用于UI展示和验证
 */
export interface ConfigMetadata {
  /**
   * 配置键（与Config.key对应）
   */
  key: string;
  
  /**
   * 配置名称（用于UI显示）
   */
  name: string;
  
  /**
   * 配置描述
   */
  description: string;
  
  /**
   * 配置分组
   */
  groupName: string;
  
  /**
   * 配置值类型
   */
  type: ConfigValueType;
  
  /**
   * 默认值（JSON字符串）
   */
  defaultValue: string;
  
  /**
   * 是否为系统配置（系统配置不可由用户直接修改）
   */
  isSystem: boolean;
  
  /**
   * 排序权重（用于UI中的显示顺序）
   */
  displayOrder: number;
  
  /**
   * 验证规则（可选，JSON字符串）
   * 例如：{ "min": 0, "max": 100 } 用于数字类型的范围验证
   */
  validationRules?: string;
}

/**
 * 配置变更事件接口
 * 用于跟踪配置的变更历史
 */
export interface ConfigChangeEvent {
  /**
   * 事件ID
   */
  id: string;
  
  /**
   * 配置键
   */
  key: string;
  
  /**
   * 旧值
   */
  oldValue: string;
  
  /**
   * 新值
   */
  newValue: string;
  
  /**
   * 变更时间
   */
  timestamp: string;
  
  /**
   * 变更原因（可选）
   */
  reason?: string;
} 