# MCP 客户端集成需求文档

## 1. 项目概述

本项目旨在 Tauri 应用中集成 MCP (Machine Conversation Protocol) 客户端功能，支持通过 SSE 和 Stdio 两种传输方式连接到 MCP 服务器。系统需要支持多客户端管理，允许用户同时连接到多个 MCP 服务器，并提供统一的接口进行工具调用、资源访问等操作。

## 2. 功能需求

### 2.1 核心功能

1. **多客户端管理**
   - 支持创建、初始化、断开连接和删除多个 MCP 客户端
   - 每个客户端有唯一标识符
   - 支持查询单个或所有客户端的状态

2. **连接方式**
   - 支持 SSE (Server-Sent Events) 传输方式
   - 支持 Stdio (标准输入输出) 传输方式

3. **MCP 操作**
   - 列出可用工具
   - 调用工具
   - 列出可用资源
   - 读取资源内容
   - 列出可用提示
   - 获取提示内容

### 2.2 用户体验需求

1. **状态管理**
   - 显示客户端连接状态
   - 提供错误信息和连接时间
   - 显示服务器信息

2. **配置管理**
   - 保存和加载客户端配置
   - 支持修改连接参数

## 3. 数据结构

### 3.1 后端数据结构 (Rust)

#### 传输类型
```rust
pub enum TransportType {
    SSE,
    Stdio,
}
```

#### 初始化客户端请求
```rust
pub struct InitializeClientRequest {
    // 服务器配置
    pub id: String,                            // 客户端唯一标识符
    pub transport_type: TransportType,         // 传输类型
    pub sse_url: Option<String>,               // SSE URL (仅 SSE 模式)
    pub command: Option<String>,               // 命令 (仅 Stdio 模式)
    pub args: Option<Vec<String>>,             // 命令参数 (仅 Stdio 模式)
    pub headers: Option<HashMap<String, String>>, // 请求头/环境变量
    pub timeout_secs: Option<u64>,             // 超时时间（秒）
    
    // 客户端信息
    pub client_name: String,                   // 客户端名称
    pub client_version: String,                // 客户端版本
}
```

#### 客户端状态
```rust
pub enum ClientStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}
```

#### 服务器信息
```rust
pub struct ServerInfo {
    pub name: String,
    pub version: String,
    pub capabilities: HashMap<String, serde_json::Value>,
}
```

#### 客户端状态响应
```rust
pub struct ClientStatusResponse {
    pub id: String,
    pub status: ClientStatus,
    pub error: Option<String>,
    pub connected_at: Option<DateTime<Utc>>,
    pub server_info: Option<ServerInfo>,
}
```

#### 操作请求
```rust
pub struct FilterRequest {
    pub client_id: String,
    pub filter: Option<String>,
}

pub struct ToolCallRequest {
    pub client_id: String,
    pub tool_name: String,
    pub params: serde_json::Value,
}

pub struct ResourceReadRequest {
    pub client_id: String,
    pub resource_uri: String,
}

pub struct PromptRequest {
    pub client_id: String,
    pub prompt_name: String,
    pub params: serde_json::Value,
}
```

#### 通用响应
```rust
pub struct McpResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}
```

#### 信息结构
```rust
pub struct ToolInfo {
    pub name: String,
    pub description: String,
    pub parameters_schema: Option<serde_json::Value>,
    pub result_schema: Option<serde_json::Value>,
}

pub struct ResourceInfo {
    pub uri: String,
    pub description: String,
    pub content_type: String,
}

pub struct PromptInfo {
    pub name: String,
    pub description: String,
    pub parameters_schema: Option<serde_json::Value>,
}
```

#### 客户端管理
```rust
// 客户端实例
struct ClientInstance {
    id: String,
    client: McpClientEnum,
    status: ClientStatus,
    connected_at: Option<DateTime<Utc>>,
    server_info: Option<ServerInfo>,
}

// 客户端类型
enum McpClientEnum {
    Sse(McpSseClient),
    Stdio(McpStdioClient),
}

// 客户端管理器
pub struct McpClientManager {
    clients: HashMap<String, ClientInstance>,
}

// 应用状态
pub struct AppState {
    pub mcp_client_manager: Mutex<McpClientManager>,
}
```

### 3.2 前端数据结构 (TypeScript)

#### 传输类型
```typescript
enum TransportType {
  SSE = 'SSE',
  Stdio = 'Stdio'
}
```

#### 客户端配置
```typescript
interface McpClientConfig {
  id: string;                      // 唯一标识符
  name: string;                    // 用户友好的名称
  transport_type: TransportType;   // 传输类型
  
  // SSE 配置
  sse_url?: string;                // SSE URL (仅 SSE 模式)
  
  // Stdio 配置
  command?: string;                // 命令 (仅 Stdio 模式)
  args?: string[];                 // 命令参数 (仅 Stdio 模式)
  
  // 通用配置
  headers?: Record<string, string>; // 请求头/环境变量
  timeout_secs?: number;           // 超时时间（秒）
  client_name: string;             // 发送给服务器的客户端名称
  client_version: string;          // 发送给服务器的客户端版本
}
```

#### 客户端状态
```typescript
enum ClientStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error'
}

interface ClientStatusResponse {
  id: string;
  status: ClientStatus;
  error?: string;
  connected_at?: string;
  server_info?: {
    name: string;
    version: string;
    capabilities: Record<string, any>;
  };
}
```

#### 操作请求
```typescript
interface FilterRequest {
  client_id: string;
  filter?: string;
}

interface ToolCallRequest {
  client_id: string;
  tool_name: string;
  params: any;
}

interface ResourceReadRequest {
  client_id: string;
  resource_uri: string;
}

interface PromptRequest {
  client_id: string;
  prompt_name: string;
  params: any;
}
```

#### 通用响应
```typescript
interface McpResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### 信息结构
```typescript
interface ToolInfo {
  name: string;
  description: string;
  parameters_schema?: any;
  result_schema?: any;
}

interface ResourceInfo {
  uri: string;
  description: string;
  content_type: string;
}

interface PromptInfo {
  name: string;
  description: string;
  parameters_schema?: any;
}
```

## 4. 实现逻辑

### 4.1 后端实现 (Rust)

#### 4.1.1 模块结构
- `client.rs`: 实现 MCP 客户端管理器
- `commands.rs`: 实现 Tauri 命令接口
- `types.rs`: 定义数据类型
- `mod.rs`: 模块导出

#### 4.1.2 客户端管理器 (McpClientManager)

**主要功能**:
1. 管理多个 MCP 客户端实例
2. 提供客户端初始化、断开连接、删除等操作
3. 提供客户端状态查询
4. 转发 MCP 操作请求到对应客户端

**核心方法**:
- `new()`: 创建新的客户端管理器
- `initialize_client(request)`: 初始化客户端
- `disconnect_client(client_id)`: 断开客户端连接
- `delete_client(client_id)`: 删除客户端
- `get_client_status(client_id)`: 获取客户端状态
- `get_all_client_statuses()`: 获取所有客户端状态
- `list_tools(request)`: 列出工具
- `call_tool(request)`: 调用工具
- `list_resources(request)`: 列出资源
- `read_resource(request)`: 读取资源
- `list_prompts(request)`: 列出提示
- `get_prompt(request)`: 获取提示

#### 4.1.3 Tauri 命令接口

**主要功能**:
1. 将 Tauri 命令映射到客户端管理器方法
2. 处理状态管理和错误转换

**核心命令**:
- `initialize_mcp_client`: 初始化 MCP 客户端
- `disconnect_mcp_client`: 断开 MCP 客户端连接
- `delete_mcp_client`: 删除 MCP 客户端
- `get_mcp_client_status`: 获取 MCP 客户端状态
- `get_all_mcp_client_statuses`: 获取所有 MCP 客户端状态
- `list_mcp_tools`: 列出 MCP 工具
- `call_mcp_tool`: 调用 MCP 工具
- `list_mcp_resources`: 列出 MCP 资源
- `read_mcp_resource`: 读取 MCP 资源
- `list_mcp_prompts`: 列出 MCP 提示
- `get_mcp_prompt`: 获取 MCP 提示

#### 4.1.4 实现流程

1. **客户端初始化**:
   - 接收初始化请求
   - 根据传输类型创建 SSE 或 Stdio 传输
   - 创建 MCP 客户端并初始化连接
   - 存储客户端实例和状态信息

2. **客户端操作**:
   - 根据客户端 ID 查找对应客户端实例
   - 执行请求的操作
   - 返回操作结果或错误信息

3. **客户端状态管理**:
   - 跟踪客户端连接状态
   - 提供状态查询接口
   - 处理连接错误和断开连接

### 4.2 前端实现 (TypeScript + React)

#### 4.2.1 服务层

**McpClientService**:
- 封装与后端 Tauri 命令的通信
- 提供客户端管理和操作方法
- 处理错误和状态转换

```typescript
class McpClientService {
  // 客户端管理
  static async initializeClient(request: InitializeClientRequest): Promise<ClientStatusResponse>;
  static async disconnectClient(clientId: string): Promise<ClientStatusResponse>;
  static async deleteClient(clientId: string): Promise<void>;
  static async getClientStatus(clientId: string): Promise<ClientStatusResponse>;
  static async getAllClientStatuses(): Promise<ClientStatusResponse[]>;
  
  // MCP 操作
  static async listTools(request: FilterRequest): Promise<McpResponse<ToolInfo[]>>;
  static async callTool(request: ToolCallRequest): Promise<McpResponse<any>>;
  static async listResources(request: FilterRequest): Promise<McpResponse<ResourceInfo[]>>;
  static async readResource(request: ResourceReadRequest): Promise<McpResponse<any>>;
  static async listPrompts(request: FilterRequest): Promise<McpResponse<PromptInfo[]>>;
  static async getPrompt(request: PromptRequest): Promise<McpResponse<any>>;
}
```

#### 4.2.2 状态管理

**McpClientContext**:
- 管理客户端状态
- 提供状态更新和查询方法
- 处理客户端选择

```typescript
interface McpClientContextType {
  clients: Record<string, ClientStatusResponse>;
  activeClientId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 方法
  setActiveClient(clientId: string): void;
  refreshClientStatus(clientId?: string): Promise<void>;
  initializeClient(config: McpClientConfig): Promise<string>;
  disconnectClient(clientId: string): Promise<void>;
  deleteClient(clientId: string): Promise<void>;
}
```

#### 4.2.3 UI 组件

1. **McpClientManager**:
   - 客户端列表和状态显示
   - 添加、连接、断开和删除客户端
   - 客户端选择

2. **McpClientConfig**:
   - 客户端配置表单
   - 支持 SSE 和 Stdio 配置
   - 配置验证和保存

3. **McpToolExplorer**:
   - 工具列表和搜索
   - 工具调用表单
   - 结果显示

4. **McpResourceBrowser**:
   - 资源列表和搜索
   - 资源内容查看
   - 资源过滤

5. **McpPromptExplorer**:
   - 提示列表和搜索
   - 提示参数表单
   - 提示内容查看

#### 4.2.4 实现流程

1. **客户端管理**:
   - 用户通过配置表单创建客户端配置
   - 调用服务层初始化客户端
   - 更新状态并显示连接结果
   - 提供客户端选择和管理界面

2. **工具调用**:
   - 列出当前选中客户端的可用工具
   - 用户选择工具并填写参数
   - 调用服务层执行工具调用
   - 显示调用结果

3. **资源访问**:
   - 列出当前选中客户端的可用资源
   - 用户选择资源进行查看
   - 调用服务层读取资源内容
   - 显示资源内容

4. **提示管理**:
   - 列出当前选中客户端的可用提示
   - 用户选择提示并填写参数
   - 调用服务层获取提示内容
   - 显示提示内容

## 5. 技术要点

### 5.1 后端技术要点

1. **多客户端管理**:
   - 使用 HashMap 存储客户端实例
   - 使用 Mutex 保证并发安全
   - 使用枚举类型区分不同传输方式的客户端

2. **异步处理**:
   - 使用 async/await 处理异步操作
   - 使用 tokio 运行时执行异步任务
   - 处理异步错误和超时

3. **错误处理**:
   - 统一错误转换和处理
   - 提供详细错误信息
   - 区分不同类型的错误

4. **资源管理**:
   - 正确释放客户端资源
   - 处理连接断开和超时
   - 避免资源泄漏

### 5.2 前端技术要点

1. **状态管理**:
   - 使用 React Context 管理全局状态
   - 使用 useState 和 useReducer 管理组件状态
   - 处理状态更新和同步

2. **异步操作**:
   - 使用 async/await 处理异步请求
   - 处理加载状态和错误
   - 实现请求取消和超时

3. **表单处理**:
   - 实现动态表单
   - 表单验证和错误提示
   - 处理复杂参数输入

4. **UI 组件**:
   - 使用 Material-UI 组件库
   - 实现响应式设计
   - 提供良好的用户体验

## 6. 测试策略

### 6.1 后端测试

1. **单元测试**:
   - 测试客户端管理器方法
   - 测试 Tauri 命令接口
   - 使用模拟对象替代实际客户端

2. **集成测试**:
   - 测试完整客户端生命周期
   - 使用本地 MCP 服务器进行测试
   - 验证错误处理和边界情况

### 6.2 前端测试

1. **组件测试**:
   - 测试 UI 组件渲染和交互
   - 测试表单验证和提交
   - 使用模拟服务替代实际 API 调用

2. **集成测试**:
   - 测试完整用户流程
   - 验证状态管理和更新
   - 测试错误处理和边界情况

## 7. 部署和配置

### 7.1 依赖项

**后端依赖**:
- `mcp_client_fishcode2025`: MCP 客户端库
- `tauri`: Tauri 框架
- `tokio`: 异步运行时
- `serde`: 序列化和反序列化
- `chrono`: 日期和时间处理

**前端依赖**:
- `@tauri-apps/api`: Tauri API
- `react`: React 框架
- `@mui/material`: Material-UI 组件库
- `react-hook-form`: 表单处理
- `zustand` 或 `jotai`: 状态管理

### 7.2 配置选项

1. **超时设置**:
   - 连接超时
   - 操作超时
   - 重试间隔

2. **日志级别**:
   - 错误
   - 警告
   - 信息
   - 调试

3. **安全设置**:
   - 允许的命令列表 (Stdio 模式)
   - 允许的 URL 模式 (SSE 模式)

## 8. 注意事项和限制

1. **安全考虑**:
   - Stdio 模式可能执行任意命令，需要限制
   - 敏感配置信息的存储和传输

2. **性能考虑**:
   - 长时间运行的操作可能阻塞 UI
   - 大量客户端可能消耗过多资源

3. **兼容性考虑**:
   - 不同 MCP 服务器版本的兼容性
   - 不同操作系统的命令路径差异

4. **错误处理**:
   - 网络错误和断开连接
   - 服务器错误和超时
   - 参数验证和类型错误

## 9. 未来扩展

1. **功能扩展**:
   - 支持更多传输方式
   - 添加更多 MCP 操作
   - 实现高级查询和过滤

2. **用户体验改进**:
   - 添加连接模板和预设
   - 实现拖放界面
   - 提供可视化结果展示

3. **集成扩展**:
   - 与其他系统集成
   - 支持插件和扩展
   - 实现自动化工作流
