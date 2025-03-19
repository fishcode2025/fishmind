use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 传输类型
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum TransportType {
    SSE,
    Stdio,
}

/// 初始化客户端请求
#[derive(Debug, Clone, Deserialize)]
pub struct InitializeClientRequest {
    // 服务器配置
    pub id: String,
    pub transport_type: TransportType,
    pub sse_url: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub headers: Option<HashMap<String, String>>,
    pub timeout_secs: Option<u64>,

    // 客户端信息
    pub client_name: String,
    pub client_version: String,
}

/// 客户端连接状态
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ClientStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}

/// 服务器信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub name: String,
    pub version: String,
    pub capabilities: HashMap<String, serde_json::Value>,
}

/// 客户端状态响应
#[derive(Debug, Clone, Serialize)]
pub struct ClientStatusResponse {
    pub id: String,
    pub status: ClientStatus,
    pub error: Option<String>,
    pub connected_at: Option<DateTime<Utc>>,
    pub server_info: Option<ServerInfo>,
}

/// 操作请求基础结构
#[derive(Debug, Deserialize)]
pub struct OperationRequest {
    pub client_id: String,
}

/// 工具调用请求
#[derive(Debug, Deserialize)]
pub struct ToolCallRequest {
    pub client_id: String,
    pub tool_name: String,
    pub params: serde_json::Value,
}

/// 资源读取请求
#[derive(Debug, Deserialize)]
pub struct ResourceReadRequest {
    pub client_id: String,
    pub resource_uri: String,
}

/// 提示获取请求
#[derive(Debug, Deserialize)]
pub struct PromptRequest {
    pub client_id: String,
    pub prompt_name: String,
    pub params: serde_json::Value,
}

/// 过滤请求
#[derive(Debug, Deserialize)]
pub struct FilterRequest {
    pub client_id: String,
    pub filter: Option<String>,
}

/// 通用响应结构
#[derive(Debug, Serialize)]
pub struct McpResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

/// 工具信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ToolInfo {
    pub name: String,
    pub description: String,
    pub parameters_schema: Option<serde_json::Value>,
    pub result_schema: Option<serde_json::Value>,
}

/// 资源信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ResourceInfo {
    pub uri: String,
    pub description: String,
    pub content_type: String,
}

/// 提示信息
#[derive(Debug, Serialize, Deserialize)]
pub struct PromptInfo {
    pub name: String,
    pub description: String,
    pub parameters_schema: Option<serde_json::Value>,
}
