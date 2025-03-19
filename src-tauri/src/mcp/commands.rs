use crate::mcp::{client::AppState, types::*};
use log;
use std::sync::Arc;
use tauri::{command, State};

/// 初始化 MCP 客户端
#[command]
pub async fn initialize_mcp_client(
    state: State<'_, Arc<AppState>>,
    request: InitializeClientRequest,
) -> Result<ClientStatusResponse, String> {
    let mut manager = state.mcp_client_manager.lock().await;
    manager.initialize_client(request).await
}

/// 断开 MCP 客户端连接
#[command]
pub async fn disconnect_mcp_client(
    state: State<'_, Arc<AppState>>,
    clientId: String,
) -> Result<ClientStatusResponse, String> {
    let mut manager = state.mcp_client_manager.lock().await;
    manager.disconnect_client(&clientId).await
}

/// 删除 MCP 客户端
#[command]
pub async fn delete_mcp_client(
    state: State<'_, Arc<AppState>>,
    clientId: String,
) -> Result<(), String> {
    let mut manager = state.mcp_client_manager.lock().await;
    manager.delete_client(&clientId).await
}

/// 获取 MCP 客户端状态
#[command]
pub async fn get_mcp_client_status(
    state: State<'_, Arc<AppState>>,
    clientId: String,
) -> Result<ClientStatusResponse, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.get_client_status(&clientId)
}

/// 获取所有 MCP 客户端状态
#[command]
pub async fn get_all_mcp_client_statuses(
    state: State<'_, Arc<AppState>>,
) -> Result<Vec<ClientStatusResponse>, String> {
    let manager = state.mcp_client_manager.lock().await;
    Ok(manager.get_all_client_statuses())
}

/// 修复 MCP 客户端连接
#[command]
pub async fn mcp_repair_client(
    state: State<'_, Arc<AppState>>,
    clientId: String,
) -> Result<ClientStatusResponse, String> {
    let mut manager = state.mcp_client_manager.lock().await;
    manager.repair_client(&clientId).await
}

/// 列出工具
#[command]
pub async fn list_mcp_tools(
    state: State<'_, Arc<AppState>>,
    request: FilterRequest,
) -> Result<McpResponse<Vec<ToolInfo>>, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.list_tools(request).await
}

/// 调用工具
#[command]
pub async fn call_mcp_tool(
    state: State<'_, Arc<AppState>>,
    request: ToolCallRequest,
) -> Result<McpResponse<serde_json::Value>, String> {
    use log::{debug, error, info};

    // 添加标准输出，确保能看到
    println!(
        "=== [MCP Command] 接收到工具调用请求: {}, 客户端ID: {} ===",
        request.tool_name, request.client_id
    );

    info!(
        "[MCP Command] 接收到工具调用请求: {}, 客户端ID: {}",
        request.tool_name, request.client_id
    );
    debug!("[MCP Command] 工具参数: {:?}", request.params);

    // 添加标准输出
    println!("=== [MCP Command] 准备获取客户端管理器锁 ===");

    let manager = state.mcp_client_manager.lock().await;

    // 添加标准输出
    println!("=== [MCP Command] 已获取客户端管理器锁，准备调用工具 ===");
    info!("[MCP Command] 已获取客户端管理器锁，准备调用工具");

    // 添加标准输出
    println!("=== [MCP Command] 调用 manager.call_tool 开始 ===");
    let result = manager.call_tool(request).await;
    println!("=== [MCP Command] 调用 manager.call_tool 完成 ===");

    match &result {
        Ok(response) => {
            if response.success {
                // 添加标准输出
                println!("=== [MCP Command] 工具调用成功 ===");
                info!("[MCP Command] 工具调用成功");
                debug!("[MCP Command] 工具调用结果: {:?}", response.data);
            } else {
                // 添加标准输出
                println!(
                    "=== [MCP Command] 工具调用失败: {} ===",
                    response.error.as_deref().unwrap_or("未知错误")
                );
                error!(
                    "[MCP Command] 工具调用失败: {}",
                    response.error.as_deref().unwrap_or("未知错误")
                );
            }
        }
        Err(err) => {
            // 添加标准输出
            println!("=== [MCP Command] 工具调用过程出错: {} ===", err);
            error!("[MCP Command] 工具调用过程出错: {}", err);
        }
    }

    // 添加标准输出
    println!("=== [MCP Command] 返回结果 ===");
    result
}

/// 列出资源
#[command]
pub async fn list_mcp_resources(
    state: State<'_, Arc<AppState>>,
    request: FilterRequest,
) -> Result<McpResponse<Vec<ResourceInfo>>, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.list_resources(request).await
}

/// 读取资源
#[command]
pub async fn read_mcp_resource(
    state: State<'_, Arc<AppState>>,
    request: ResourceReadRequest,
) -> Result<McpResponse<serde_json::Value>, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.read_resource(request).await
}

/// 列出提示
#[command]
pub async fn list_mcp_prompts(
    state: State<'_, Arc<AppState>>,
    request: FilterRequest,
) -> Result<McpResponse<Vec<PromptInfo>>, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.list_prompts(request).await
}

/// 获取提示
#[command]
pub async fn get_mcp_prompt(
    state: State<'_, Arc<AppState>>,
    request: PromptRequest,
) -> Result<McpResponse<serde_json::Value>, String> {
    let manager = state.mcp_client_manager.lock().await;
    manager.get_prompt(request).await
}
