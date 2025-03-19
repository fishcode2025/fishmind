// 现有类型定义的扩展

/**
 * 工具信息
 */
export interface ToolInfo {
    /**
     * 工具名称
     */
    name: string;
    
    /**
     * 工具描述
     */
    description: string;
    
    /**
     * 工具参数模式
     */
    parameters_schema?: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
    
    /**
     * 工具结果模式
     */
    result_schema?: any;
  }
  
  /**
   * 资源信息
   */
  export interface ResourceInfo {
    /**
     * 资源URI
     */
    uri: string;
    
    /**
     * 资源描述
     */
    description: string;
    
    /**
     * 资源内容类型
     */
    content_type: string;
    
    /**
     * 资源名称
     */
    name?: string;
    
    /**
     * 资源大小（字节）
     */
    size?: number;
  }
  
  /**
   * 提示信息
   */
  export interface PromptInfo {
    /**
     * 提示名称
     */
    name: string;
    
    /**
     * 提示描述
     */
    description: string;
    
    /**
     * 提示参数模式
     */
    parameters_schema?: {
      type: string;
      properties?: Record<string, any>;
      required?: string[];
    };
  }
  
  /**
   * MCP响应
   */
  export interface McpResponse<T> {
    /**
     * 是否成功
     */
    success: boolean;
    
    /**
     * 响应数据
     */
    data?: T;
    
    /**
     * 错误信息
     */
    error?: string;
  }
  
  /**
   * 过滤请求
   */
  export interface FilterRequest {
    /**
     * 客户端ID
     */
    client_id: string;
    
    /**
     * 过滤条件
     */
    filter?: Record<string, any>;
  }
  
  /**
   * 工具调用请求
   */
  export interface ToolCallRequest {
    /**
     * 客户端ID
     */
    client_id: string;
    
    /**
     * 工具名称
     */
    tool_name: string;
    
    /**
     * 工具参数
     */
    params?: Record<string, any>;
  }
  
  /**
   * 资源读取请求
   */
  export interface ResourceReadRequest {
    /**
     * 客户端ID
     */
    client_id: string;
    
    /**
     * 资源URI
     */
    resource_uri: string;
  }
  
  /**
   * 提示请求
   */
  export interface PromptRequest {
    /**
     * 客户端ID
     */
    client_id: string;
    
    /**
     * 提示名称
     */
    prompt_name: string;
    
    /**
     * 提示参数
     */
    params?: Record<string, any>;
  }
  
  /**
   * 工具调用结果
   */
  export interface ToolCallResult {
    /**
     * 结果内容
     */
    content: any;
    
    /**
     * 是否出错
     */
    isError?: boolean;
  }
  
  /**
   * 资源内容
   */
  export interface ResourceContent {
    /**
     * 资源URI
     */
    uri: string;
    
    /**
     * 资源MIME类型
     */
    mimeType?: string;
    
    /**
     * 文本内容（如果是文本资源）
     */
    text?: string;
    
    /**
     * 二进制内容（如果是二进制资源，Base64编码）
     */
    blob?: string;
  }
  
  /**
   * 提示消息
   */
  export interface PromptMessage {
    /**
     * 角色（用户或助手）
     */
    role: 'user' | 'assistant';
    
    /**
     * 消息内容
     */
    content: any;
  }