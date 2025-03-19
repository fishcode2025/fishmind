/**
 * MCP 客户端核心类型定义
 * 与后端 src-tauri/src/mcp/types.rs 保持同步
 */

// 传输类型枚举
export enum TransportType {
  SSE = 'SSE',
  Stdio = 'Stdio'
}

// 客户端状态枚举
export enum ClientStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

// MCP服务配置接口
export interface McpServerConfig {
  id: string;                      // 客户端唯一标识符
  name: string;                    // 用户友好名称
  transportType: TransportType;     // 传输类型
  
  // SSE 配置
  sseUrl?: string;                  // SSE服务器地址
  sseHeaders?: Record<string, string>; // SSE请求头
  
  // Stdio 配置
  command?: string;                // 可执行命令
  args?: string[];                 // 命令参数
  envVars?: Record<string, string>;   // 环境变量

  // 通用配置
  timeoutSecs: number;              // 超时时间（秒）
  clientName: string;                // 客户端名称（上报给服务器）
  clientVersion: string;              // 客户端版本（上报给服务器）
  enabled: boolean;                  // 是否启用
}

// 服务器信息结构
export interface ServerInfo {
  name: string;
  version: string;
  capabilities: Record<string, any>;
}

// 客户端状态响应
export interface ClientStatusResponse {
  id: string;
  status: ClientStatus;
  error?: string;
  connected_at?: string;  // ISO 8601格式时间
  server_info?: ServerInfo;
  isRefreshing?: boolean; // 是否正在刷新状态
  isRepairing?: boolean;  // 是否正在修复连接
}

// 操作请求基础类型
export interface McpBaseRequest {
  client_id: string;
}

// 过滤请求
export interface FilterRequest extends McpBaseRequest {
  filter?: string;
}

// 工具调用请求
export interface ToolCallRequest extends McpBaseRequest {
  tool_name: string;
  params: any;  // 对应serde_json::Value
}

// 资源读取请求
export interface ResourceReadRequest extends McpBaseRequest {
  resource_uri: string;
}

// 提示请求
export interface PromptRequest extends McpBaseRequest {
  prompt_name: string;
  params: any;  // 对应serde_json::Value
}

// 通用响应结构
export interface McpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 工具信息
export interface ToolInfo {
  name: string;
  description: string;
  parameters_schema?: any;  // JSON Schema
  result_schema?: any;      // JSON Schema
}

// 资源信息
export interface ResourceInfo {
  uri: string;
  name: string;
  description: string;
  content_type: string;
}

// 提示信息
export interface PromptInfo {
  name: string;
  description: string;
  parameters_schema?: any;  // JSON Schema
}

// 客户端初始化请求（用于与Tauri通信）
export interface InitializeClientRequest extends Omit<McpServerConfig, 'id'> {
  id?: string; // 允许后端生成ID
}

// 客户端连接状态事件类型
export type ClientConnectionEvent = 
  | { type: 'connecting'; clientId: string }
  | { type: 'connected'; clientId: string; serverInfo: ServerInfo }
  | { type: 'disconnected'; clientId: string }
  | { type: 'error'; clientId: string; error: string };
