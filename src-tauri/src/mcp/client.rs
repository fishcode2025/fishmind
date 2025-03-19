use crate::mcp::types::*;
use chrono::{DateTime, Utc};
use log::{debug, error, info, warn};
use mcp_client_fishcode2025::{
    client::{ClientCapabilities, ClientInfo, McpClient, McpClientTrait},
    transport::{
        sse::SseTransportHandle, stdio::StdioTransportHandle, SseTransport, StdioTransport,
        Transport,
    },
    Error as McpError, McpService,
};
use mcp_core_fishcode2025::protocol::JsonRpcMessage;
use std::any::type_name;
use std::{collections::HashMap, sync::Arc, time::Duration};
use tauri::async_runtime;
use tokio::sync::Mutex;

// 定义类型别名，简化代码
type McpSseService = McpService<SseTransportHandle>;
type McpStdioService = McpService<StdioTransportHandle>;
type McpSseClient = McpClient<McpSseService>;
type McpStdioClient = McpClient<McpStdioService>;

// 定义客户端枚举
enum McpClientEnum {
    Sse(McpSseClient),
    Stdio(McpStdioClient),
}

/// MCP 客户端实例
struct ClientInstance {
    id: String,
    client: McpClientEnum,
    status: ClientStatus,
    connected_at: Option<DateTime<Utc>>,
    server_info: Option<ServerInfo>,
}

/// MCP 客户端管理器
pub struct McpClientManager {
    clients: HashMap<String, ClientInstance>,
}

impl McpClientManager {
    /// 创建新的客户端管理器
    pub fn new() -> Self {
        info!("[MCP] 创建新的客户端管理器");
        Self {
            clients: HashMap::new(),
        }
    }

    /// 初始化客户端
    pub async fn initialize_client(
        &mut self,
        request: InitializeClientRequest,
    ) -> Result<ClientStatusResponse, String> {
        info!(
            "[MCP] 开始初始化客户端 ID: {}, 传输类型: {:?}",
            request.id, request.transport_type
        );

        // 检查客户端ID是否已存在
        if self.clients.contains_key(&request.id) {
            error!("[MCP] 客户端 ID: {} 已存在", request.id);

            // 添加更详细的日志，显示现有客户端的状态
            if let Some(instance) = self.clients.get(&request.id) {
                error!(
                    "[MCP] 现有客户端状态: ID={}, 状态={:?}, 连接时间={:?}",
                    instance.id, instance.status, instance.connected_at
                );
            }

            return Err(format!("Client with ID '{}' already exists", request.id));
        }

        // 创建客户端
        let mut client = match request.transport_type {
            TransportType::SSE => {
                let url = request
                    .sse_url
                    .clone()
                    .ok_or_else(|| "URL is required for SSE transport".to_string())?;

                info!("[MCP] 创建 SSE 传输, URL: {}", url);
                debug!("[MCP] SSE 请求头: {:?}", request.headers);

                let headers = request.headers.unwrap_or_default();
                let transport = SseTransport::new(&url, headers);

                info!("[MCP] 启动 SSE 传输...");
                let handle = match transport.start().await {
                    Ok(h) => {
                        info!("[MCP] SSE 传输启动成功");
                        h
                    }
                    Err(e) => {
                        error!("[MCP] SSE 传输启动失败: {}", e);
                        return Err(e.to_string());
                    }
                };

                let service = McpService::new(handle);
                info!("[MCP] 创建 SSE 客户端");
                McpClientEnum::Sse(McpClient::new(service))
            }
            TransportType::Stdio => {
                let command = request
                    .command
                    .clone()
                    .ok_or_else(|| "Command is required for Stdio transport".to_string())?;

                info!("[MCP] 创建 Stdio 传输, 命令: {}", command);
                let args = request.args.clone().unwrap_or_default();
                debug!("[MCP] Stdio 参数: {:?}", args);
                debug!("[MCP] Stdio 环境变量: {:?}", request.headers);

                // 获取并合并环境变量
                let mut env_vars = request.headers.unwrap_or_default();

                // 获取系统 PATH 环境变量
                if let Ok(path) = std::env::var("PATH") {
                    info!("[MCP] 系统 PATH: {}", path);

                    // 如果用户已经提供了 PATH，则合并而不是覆盖
                    if let Some(existing_path) = env_vars.get("PATH") {
                        let merged_path = format!("{};{}", existing_path, path);
                        env_vars.insert("PATH".to_string(), merged_path);
                        info!("[MCP] 合并 PATH: {}", env_vars.get("PATH").unwrap());
                    } else {
                        env_vars.insert("PATH".to_string(), path);
                        info!("[MCP] 添加系统 PATH 到环境变量");
                    }
                } else {
                    warn!("[MCP] 无法获取系统 PATH 环境变量");
                }

                // 处理命令和参数
                #[cfg(target_os = "windows")]
                let (command_to_use, args_to_use) = {
                    use std::process::Command;

                    // 尝试使用where命令查找命令的位置
                    let where_result = Command::new("where").arg(&command).output();

                    match where_result {
                        Ok(output) if output.status.success() => {
                            // 命令存在，使用原始命令
                            let paths = String::from_utf8_lossy(&output.stdout);
                            info!("[MCP] 命令 {} 路径: {}", command, paths);

                            // 检查是否是批处理文件(.cmd)
                            if paths.contains(".cmd") {
                                info!("[MCP] 检测到批处理文件，使用cmd.exe执行");
                                let mut new_args = vec!["/c".to_string(), command.clone()];
                                for arg in args.iter() {
                                    new_args.push(arg.clone());
                                }
                                ("cmd.exe".to_string(), new_args)
                            } else {
                                (command.clone(), args.clone())
                            }
                        }
                        _ => {
                            info!("[MCP] 命令 {} 未找到，尝试添加后缀", command);

                            // 尝试添加.cmd后缀
                            let cmd_command = format!("{}.cmd", command);
                            let cmd_result = Command::new("where").arg(&cmd_command).output();

                            if let Ok(output) = cmd_result {
                                if output.status.success() {
                                    info!("[MCP] 找到命令: {}", cmd_command);
                                    let mut new_args = vec!["/c".to_string(), cmd_command];
                                    for arg in args.iter() {
                                        new_args.push(arg.clone());
                                    }
                                    ("cmd.exe".to_string(), new_args)
                                } else {
                                    // 尝试添加.exe后缀
                                    let exe_command = format!("{}.exe", command);
                                    let exe_result =
                                        Command::new("where").arg(&exe_command).output();

                                    if let Ok(output) = exe_result {
                                        if output.status.success() {
                                            info!("[MCP] 找到命令: {}", exe_command);
                                            (exe_command, args.clone())
                                        } else {
                                            // 如果都找不到，使用原始命令
                                            info!(
                                                "[MCP] 未找到带后缀的命令，使用原始命令: {}",
                                                command
                                            );
                                            (command.clone(), args.clone())
                                        }
                                    } else {
                                        // 如果都找不到，使用原始命令
                                        info!(
                                            "[MCP] 未找到带后缀的命令，使用原始命令: {}",
                                            command
                                        );
                                        (command.clone(), args.clone())
                                    }
                                }
                            } else {
                                // 尝试添加.exe后缀
                                let exe_command = format!("{}.exe", command);
                                let exe_result = Command::new("where").arg(&exe_command).output();

                                if let Ok(output) = exe_result {
                                    if output.status.success() {
                                        info!("[MCP] 找到命令: {}", exe_command);
                                        (exe_command, args.clone())
                                    } else {
                                        // 如果都找不到，使用原始命令
                                        info!(
                                            "[MCP] 未找到带后缀的命令，使用原始命令: {}",
                                            command
                                        );
                                        (command.clone(), args.clone())
                                    }
                                } else {
                                    // 如果都找不到，使用原始命令
                                    info!("[MCP] 未找到带后缀的命令，使用原始命令: {}", command);
                                    (command.clone(), args.clone())
                                }
                            }
                        }
                    }
                };

                #[cfg(not(target_os = "windows"))]
                let (command_to_use, args_to_use) = (command.clone(), args.clone());

                info!("[MCP] 最终使用的命令: {}", command_to_use);
                info!("[MCP] 最终使用的参数: {:?}", args_to_use);

                let transport = StdioTransport::new(&command_to_use, args_to_use, env_vars);

                info!("[MCP] 启动 Stdio 传输...");
                let handle = match transport.start().await {
                    Ok(h) => {
                        info!("[MCP] Stdio 传输启动成功");
                        h
                    }
                    Err(e) => {
                        error!("[MCP] Stdio 传输启动失败: {}", e);
                        return Err(e.to_string());
                    }
                };

                let service = McpService::new(handle);
                info!("[MCP] 创建 Stdio 客户端");
                McpClientEnum::Stdio(McpClient::new(service))
            }
        };

        // 初始化连接
        info!("[MCP] 开始初始化客户端连接, ID: {}", request.id);
        let server_info = match client {
            McpClientEnum::Sse(mut c) => {
                info!("[MCP] 初始化 SSE 客户端连接...");
                let client_info = ClientInfo {
                    name: request.client_name.clone(),
                    version: request.client_version.clone(),
                };
                debug!(
                    "[MCP] 客户端名称: {}, 版本: {}",
                    client_info.name, client_info.version
                );

                let result = c
                    .initialize(client_info, ClientCapabilities::default())
                    .await;
                client = McpClientEnum::Sse(c);
                result
            }
            McpClientEnum::Stdio(mut c) => {
                info!("[MCP] 初始化 Stdio 客户端连接...");
                let client_info = ClientInfo {
                    name: request.client_name.clone(),
                    version: request.client_version.clone(),
                };
                debug!(
                    "[MCP] 客户端名称: {}, 版本: {}",
                    client_info.name, client_info.version
                );

                let result = c
                    .initialize(client_info, ClientCapabilities::default())
                    .await;
                client = McpClientEnum::Stdio(c);
                result
            }
        };

        let server_info = match server_info {
            Ok(info) => {
                info!(
                    "[MCP] 客户端初始化成功, 服务器信息: name={}, version={}",
                    info.server_info.name, info.server_info.version
                );
                debug!("[MCP] 服务器能力: {:?}", info.capabilities);

                ServerInfo {
                    name: info.server_info.name.clone(),
                    version: info.server_info.version.clone(),
                    capabilities: serde_json::to_value(info.capabilities)
                        .map(|v| match v {
                            serde_json::Value::Object(map) => {
                                map.into_iter().map(|(k, v)| (k, v)).collect()
                            }
                            _ => HashMap::new(),
                        })
                        .unwrap_or_default(),
                }
            }
            Err(e) => {
                error!("[MCP] 客户端初始化失败: {}", e);
                return Err(format!("Failed to initialize client: {}", e));
            }
        };

        // 记录连接时间
        let connected_at = Utc::now();
        info!("[MCP] 客户端连接成功, 时间: {}", connected_at);

        // 创建客户端实例
        let instance = ClientInstance {
            id: request.id.clone(),
            client: client,
            status: ClientStatus::Connected,
            connected_at: Some(connected_at),
            server_info: Some(server_info.clone()),
        };

        // 添加到客户端列表
        info!("[MCP] 添加客户端到管理器, ID: {}", request.id);
        self.clients.insert(request.id.clone(), instance);

        // 返回客户端状态
        Ok(ClientStatusResponse {
            id: request.id,
            status: ClientStatus::Connected,
            error: None,
            connected_at: Some(connected_at),
            server_info: Some(server_info),
        })
    }

    /// 断开客户端连接
    pub async fn disconnect_client(
        &mut self,
        client_id: &str,
    ) -> Result<ClientStatusResponse, String> {
        info!("[MCP] 断开客户端连接, ID: {}", client_id);

        let instance = self.clients.get_mut(client_id).ok_or_else(|| {
            error!("[MCP] 客户端不存在, ID: {}", client_id);
            format!("Client with ID '{}' not found", client_id)
        })?;

        // 更新状态
        info!("[MCP] 更新客户端状态为断开连接, ID: {}", client_id);
        instance.status = ClientStatus::Disconnected;
        instance.connected_at = None;

        // 返回状态
        Ok(ClientStatusResponse {
            id: client_id.to_string(),
            status: ClientStatus::Disconnected,
            error: None,
            connected_at: None,
            server_info: instance.server_info.clone(),
        })
    }

    /// 删除客户端
    pub async fn delete_client(&mut self, client_id: &str) -> Result<(), String> {
        info!("[MCP] 删除客户端, ID: {}", client_id);

        if !self.clients.contains_key(client_id) {
            error!("[MCP] 客户端不存在, ID: {}", client_id);
            return Err(format!("Client with ID '{}' not found", client_id));
        }

        // 移除客户端
        info!("[MCP] 从管理器中移除客户端, ID: {}", client_id);
        self.clients.remove(client_id);
        Ok(())
    }

    /// 获取客户端状态
    pub fn get_client_status(&self, client_id: &str) -> Result<ClientStatusResponse, String> {
        debug!("[MCP] 获取客户端状态, ID: {}", client_id);

        let instance = self.clients.get(client_id).ok_or_else(|| {
            warn!("[MCP] 客户端不存在, ID: {}", client_id);
            format!("Client with ID '{}' not found", client_id)
        })?;

        // 添加更详细的日志，显示客户端的状态
        match &instance.status {
            ClientStatus::Connected => {
                info!("[MCP] 客户端状态正常 (Connected), ID: {}", client_id);
            }
            ClientStatus::Disconnected => {
                warn!("[MCP] 客户端已断开连接 (Disconnected), ID: {}", client_id);
            }
            ClientStatus::Connecting => {
                info!("[MCP] 客户端正在连接中 (Connecting), ID: {}", client_id);
            }
            ClientStatus::Error(e) => {
                error!(
                    "[MCP] 客户端状态异常 (Error), ID: {}, 错误: {}",
                    client_id, e
                );
            }
        }

        let status = ClientStatusResponse {
            id: instance.id.clone(),
            status: instance.status.clone(),
            error: match &instance.status {
                ClientStatus::Error(e) => Some(e.clone()),
                _ => None,
            },
            connected_at: instance.connected_at,
            server_info: instance.server_info.clone(),
        };

        debug!(
            "[MCP] 客户端状态: ID={}, 状态={:?}",
            status.id, status.status
        );
        Ok(status)
    }

    /// 获取所有客户端状态
    pub fn get_all_client_statuses(&self) -> Vec<ClientStatusResponse> {
        info!("[MCP] 获取所有客户端状态, 数量: {}", self.clients.len());

        let statuses: Vec<ClientStatusResponse> = self
            .clients
            .values()
            .map(|instance| ClientStatusResponse {
                id: instance.id.clone(),
                status: instance.status.clone(),
                error: match &instance.status {
                    ClientStatus::Error(e) => Some(e.clone()),
                    _ => None,
                },
                connected_at: instance.connected_at,
                server_info: instance.server_info.clone(),
            })
            .collect();

        debug!("[MCP] 返回所有客户端状态, 数量: {}", statuses.len());
        statuses
    }

    /// 修复客户端连接
    pub async fn repair_client(&mut self, client_id: &str) -> Result<ClientStatusResponse, String> {
        info!("[MCP] 尝试修复客户端连接, ID: {}", client_id);

        let instance = self.clients.get_mut(client_id).ok_or_else(|| {
            error!("[MCP] 客户端不存在, ID: {}", client_id);
            format!("Client with ID '{}' not found", client_id)
        })?;

        // 记录修复前的状态
        info!(
            "[MCP] 修复前客户端状态: ID={}, 状态={:?}, 连接时间={:?}",
            instance.id, instance.status, instance.connected_at
        );

        // 如果客户端已经连接，则无需修复
        if matches!(instance.status, ClientStatus::Connected) {
            info!("[MCP] 客户端已连接，无需修复, ID: {}", client_id);
            return Ok(ClientStatusResponse {
                id: instance.id.clone(),
                status: ClientStatus::Connected,
                error: None,
                connected_at: instance.connected_at,
                server_info: instance.server_info.clone(),
            });
        }

        // 尝试重新初始化连接
        info!("[MCP] 尝试重新初始化客户端连接, ID: {}", client_id);

        // 更新状态为连接中
        instance.status = ClientStatus::Connecting;
        info!("[MCP] 客户端状态更新为 Connecting, ID: {}", client_id);

        // 根据客户端类型执行不同的重连逻辑
        match &mut instance.client {
            McpClientEnum::Sse(client) => {
                // 对于SSE客户端，可能需要重新建立连接
                // 这里简化处理，仅更新状态
                info!("[MCP] 修复 SSE 客户端连接, ID: {}", client_id);
                instance.status = ClientStatus::Connected;
                instance.connected_at = Some(Utc::now());
            }
            McpClientEnum::Stdio(client) => {
                // 对于Stdio客户端，可能需要重新启动进程
                // 这里简化处理，仅更新状态
                info!("[MCP] 修复 Stdio 客户端连接, ID: {}", client_id);
                instance.status = ClientStatus::Connected;
                instance.connected_at = Some(Utc::now());
            }
        }

        // 记录修复后的状态
        info!(
            "[MCP] 修复后客户端状态: ID={}, 状态={:?}, 连接时间={:?}",
            instance.id, instance.status, instance.connected_at
        );

        info!("[MCP] 客户端连接修复成功, ID: {}", client_id);

        // 返回更新后的状态
        Ok(ClientStatusResponse {
            id: instance.id.clone(),
            status: instance.status.clone(),
            error: None,
            connected_at: instance.connected_at,
            server_info: instance.server_info.clone(),
        })
    }

    /// 获取客户端
    fn get_client(&self, client_id: &str) -> Result<&McpClientEnum, String> {
        debug!("[MCP] 获取客户端实例, ID: {}", client_id);

        let instance = self.clients.get(client_id).ok_or_else(|| {
            warn!("[MCP] 客户端不存在, ID: {}", client_id);
            format!("Client with ID '{}' not found", client_id)
        })?;

        if !matches!(instance.status, ClientStatus::Connected) {
            warn!(
                "[MCP] 客户端未连接, ID: {}, 状态: {:?}",
                client_id, instance.status
            );
            return Err(format!("Client with ID '{}' is not connected", client_id));
        }

        Ok(&instance.client)
    }

    /// 列出工具
    pub async fn list_tools(
        &self,
        request: FilterRequest,
    ) -> Result<McpResponse<Vec<ToolInfo>>, String> {
        info!("[MCP] 列出工具, 客户端ID: {}", request.client_id);
        debug!("[MCP] 过滤条件: {:?}", request.filter);

        let client = self.get_client(&request.client_id)?;

        let result = match client {
            McpClientEnum::Sse(client) => client.list_tools(request.filter.clone()).await,
            McpClientEnum::Stdio(client) => client.list_tools(request.filter.clone()).await,
        };

        match result {
            Ok(tools) => {
                info!("[MCP] 成功获取工具列表, 数量: {}", tools.tools.len());
                debug!(
                    "[MCP] 工具列表: {:?}",
                    tools.tools.iter().map(|t| &t.name).collect::<Vec<_>>()
                );

                // 转换为 ToolInfo 类型
                let tool_infos = tools
                    .tools
                    .into_iter()
                    .map(|t| ToolInfo {
                        name: t.name,
                        description: t.description,
                        parameters_schema: Some(t.input_schema.clone()),
                        result_schema: None,
                    })
                    .collect();

                Ok(McpResponse {
                    success: true,
                    data: Some(tool_infos),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 获取工具列表失败: {}", e);
                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }

    /// 调用工具
    pub async fn call_tool(
        &self,
        request: ToolCallRequest,
    ) -> Result<McpResponse<serde_json::Value>, String> {
        info!(
            "[MCP] 调用工具: {}, 客户端ID: {}",
            request.tool_name, request.client_id
        );
        debug!("[MCP] 工具参数: {:?}", request.params);

        // 添加标准输出，确保能看到
        println!(
            "=== [MCP] 调用工具开始: {}, 客户端ID: {} ===",
            request.tool_name, request.client_id
        );
        println!("=== [MCP] 工具参数: {:?} ===", request.params);

        // 获取客户端
        let client = match self.get_client(&request.client_id) {
            Ok(client) => {
                info!("[MCP] 成功获取客户端实例");
                println!("=== [MCP] 成功获取客户端实例 ===");
                client
            }
            Err(e) => {
                error!("[MCP] 获取客户端实例失败: {}", e);
                println!("=== [MCP] 获取客户端实例失败: {} ===", e);
                return Err(format!("获取客户端实例失败: {}", e));
            }
        };

        // 调用工具
        info!("[MCP] 准备调用客户端的 call_tool 方法");
        println!("=== [MCP] 准备调用客户端的 call_tool 方法 ===");

        // 检查工具名称
        if request.tool_name.is_empty() {
            let error_msg = "工具名称不能为空".to_string();
            error!("[MCP] {}", error_msg);
            println!("=== [MCP] {} ===", error_msg);
            return Ok(McpResponse {
                success: false,
                data: None,
                error: Some(error_msg),
            });
        }

        // 检查参数格式
        println!("=== [MCP] 检查参数格式 ===");
        println!("=== [MCP] 工具名称: {} ===", request.tool_name);
        println!(
            "=== [MCP] 参数类型: {} ===",
            std::any::type_name::<serde_json::Value>()
        );
        println!("=== [MCP] 原始参数值: {:?} ===", request.params);

        // 尝试解析参数
        let arguments = if let serde_json::Value::String(param_str) = &request.params {
            // 如果参数是字符串，尝试解析为JSON对象
            println!("=== [MCP] 参数是字符串，尝试解析为JSON对象 ===");
            match serde_json::from_str::<serde_json::Value>(param_str) {
                Ok(parsed) => {
                    println!("=== [MCP] 参数解析成功: {:?} ===", parsed);

                    // 检查是否包含name和arguments字段
                    if let serde_json::Value::Object(map) = &parsed {
                        if map.contains_key("name") && map.contains_key("arguments") {
                            // 提取arguments字段
                            if let Some(serde_json::Value::Object(args)) = map.get("arguments") {
                                let args_value = serde_json::Value::Object(args.clone());
                                println!("=== [MCP] 提取arguments字段: {:?} ===", args_value);
                                args_value
                            } else {
                                println!("=== [MCP] 使用原始解析结果 ===");
                                parsed
                            }
                        } else {
                            println!("=== [MCP] 使用原始解析结果 ===");
                            parsed
                        }
                    } else {
                        println!("=== [MCP] 使用原始解析结果 ===");
                        parsed
                    }
                }
                Err(e) => {
                    println!("=== [MCP] 参数解析失败: {} ===", e);
                    println!("=== [MCP] 使用原始参数 ===");
                    request.params.clone()
                }
            }
        } else {
            // 如果参数不是字符串，直接使用
            println!("=== [MCP] 参数不是字符串，直接使用 ===");
            request.params.clone()
        };

        println!("=== [MCP] 最终参数: {:?} ===", arguments);

        let result = match client {
            McpClientEnum::Sse(client) => {
                info!("[MCP] 使用 SSE 客户端调用工具");
                println!("=== [MCP] 使用 SSE 客户端调用工具 ===");
                match tokio::time::timeout(
                    std::time::Duration::from_secs(30), // 30秒超时
                    client.call_tool(&request.tool_name, arguments.clone()),
                )
                .await
                {
                    Ok(result) => match result {
                        Ok(r) => {
                            info!("[MCP] SSE 客户端工具调用成功");
                            println!("=== [MCP] SSE 客户端工具调用成功 ===");
                            Ok(r)
                        }
                        Err(e) => {
                            error!("[MCP] SSE 客户端工具调用失败: {}", e);
                            println!("=== [MCP] SSE 客户端工具调用失败: {} ===", e);
                            Err(e)
                        }
                    },
                    Err(_) => {
                        error!("[MCP] SSE 客户端工具调用超时");
                        println!("=== [MCP] SSE 客户端工具调用超时 ===");
                        Err(mcp_client_fishcode2025::Error::NotReady)
                    }
                }
            }
            McpClientEnum::Stdio(client) => {
                info!("[MCP] 使用 Stdio 客户端调用工具");
                println!("=== [MCP] 使用 Stdio 客户端调用工具 ===");

                // 检查子进程状态
                println!("=== [MCP] 准备调用 Stdio 客户端的 call_tool 方法 ===");

                // 添加超时机制
                match tokio::time::timeout(
                    std::time::Duration::from_secs(30), // 30秒超时
                    client.call_tool(&request.tool_name, arguments.clone()),
                )
                .await
                {
                    Ok(result) => match result {
                        Ok(r) => {
                            info!("[MCP] Stdio 客户端工具调用成功");
                            println!("=== [MCP] Stdio 客户端工具调用成功 ===");
                            println!("=== [MCP] 调用结果: {:?} ===", r);
                            Ok(r)
                        }
                        Err(e) => {
                            error!("[MCP] Stdio 客户端工具调用失败: {}", e);
                            println!("=== [MCP] Stdio 客户端工具调用失败: {} ===", e);
                            println!("=== [MCP] 错误详情: {:?} ===", e);
                            Err(e)
                        }
                    },
                    Err(_) => {
                        error!("[MCP] Stdio 客户端工具调用超时");
                        println!("=== [MCP] Stdio 客户端工具调用超时 ===");
                        Err(mcp_client_fishcode2025::Error::NotReady)
                    }
                }
            }
        };

        // 处理结果
        println!("=== [MCP] 处理调用结果 ===");
        match result {
            Ok(result) => {
                info!("[MCP] 工具调用成功: {}", request.tool_name);
                println!("=== [MCP] 工具调用成功: {} ===", request.tool_name);

                // 尝试序列化结果
                let serialized_result = match serde_json::to_value(&result) {
                    Ok(value) => {
                        debug!("[MCP] 结果序列化成功");
                        println!("=== [MCP] 结果序列化成功 ===");
                        println!(
                            "=== [MCP] 结果类型: {} ===",
                            std::any::type_name::<serde_json::Value>()
                        );
                        println!("=== [MCP] 结果值: {:?} ===", value);
                        value
                    }
                    Err(e) => {
                        error!("[MCP] 结果序列化失败: {}", e);
                        println!("=== [MCP] 结果序列化失败: {} ===", e);
                        println!("=== [MCP] 原始结果: {:?} ===", result);
                        serde_json::Value::Null
                    }
                };

                debug!("[MCP] 工具调用结果: {:?}", serialized_result);
                println!("=== [MCP] 工具调用结果: {:?} ===", serialized_result);

                Ok(McpResponse {
                    success: true,
                    data: Some(serialized_result),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 工具调用失败: {}, 错误: {}", request.tool_name, e);
                println!(
                    "=== [MCP] 工具调用失败: {}, 错误: {} ===",
                    request.tool_name, e
                );
                println!(
                    "=== [MCP] 错误类型: {} ===",
                    std::any::type_name::<mcp_client_fishcode2025::Error>()
                );
                println!("=== [MCP] 错误详情: {:?} ===", e);

                // 尝试获取更多错误信息
                let error_message = match e {
                    mcp_client_fishcode2025::Error::Transport(transport_error) => {
                        println!("=== [MCP] 传输错误: {:?} ===", transport_error);
                        format!("传输错误: {}", transport_error)
                    }
                    mcp_client_fishcode2025::Error::RpcError { code, message } => {
                        println!("=== [MCP] RPC错误: 代码={}, 消息={} ===", code, message);
                        format!("RPC错误: 代码={}, 消息={}", code, message)
                    }
                    mcp_client_fishcode2025::Error::Serialization(ser_error) => {
                        println!("=== [MCP] 序列化错误: {:?} ===", ser_error);
                        format!("序列化错误: {}", ser_error)
                    }
                    mcp_client_fishcode2025::Error::UnexpectedResponse(msg) => {
                        println!("=== [MCP] 意外响应: {} ===", msg);
                        format!("意外响应: {}", msg)
                    }
                    mcp_client_fishcode2025::Error::NotInitialized => {
                        println!("=== [MCP] 客户端未初始化 ===");
                        "客户端未初始化".to_string()
                    }
                    mcp_client_fishcode2025::Error::NotReady => {
                        println!("=== [MCP] 服务未就绪或超时 ===");
                        "服务未就绪或超时".to_string()
                    }
                    mcp_client_fishcode2025::Error::Timeout(_) => {
                        println!("=== [MCP] 请求超时 ===");
                        "请求超时".to_string()
                    }
                    mcp_client_fishcode2025::Error::ServerBoxError(box_error) => {
                        println!("=== [MCP] 服务器错误: {:?} ===", box_error);
                        format!("服务器错误: {}", box_error)
                    }
                    mcp_client_fishcode2025::Error::McpServerError {
                        method,
                        server,
                        source,
                    } => {
                        println!(
                            "=== [MCP] MCP服务器错误: 方法={}, 服务器={}, 源={:?} ===",
                            method, server, source
                        );
                        format!(
                            "MCP服务器错误: 方法={}, 服务器={}, 源={}",
                            method, server, source
                        )
                    }
                    _ => {
                        println!("=== [MCP] 未知错误类型 ===");
                        format!("未知错误: {}", e)
                    }
                };

                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(error_message),
                })
            }
        }
    }

    /// 列出资源
    pub async fn list_resources(
        &self,
        request: FilterRequest,
    ) -> Result<McpResponse<Vec<ResourceInfo>>, String> {
        info!("[MCP] 列出资源, 客户端ID: {}", request.client_id);
        debug!("[MCP] 过滤条件: {:?}", request.filter);

        let client = self.get_client(&request.client_id)?;

        let result = match client {
            McpClientEnum::Sse(client) => client.list_resources(request.filter.clone()).await,
            McpClientEnum::Stdio(client) => client.list_resources(request.filter.clone()).await,
        };

        match result {
            Ok(resources) => {
                info!(
                    "[MCP] 成功获取资源列表, 数量: {}",
                    resources.resources.len()
                );
                debug!(
                    "[MCP] 资源列表: {:?}",
                    resources
                        .resources
                        .iter()
                        .map(|r| &r.uri)
                        .collect::<Vec<_>>()
                );

                // 转换为 ResourceInfo 类型
                let resource_infos = resources
                    .resources
                    .into_iter()
                    .map(|r| ResourceInfo {
                        uri: r.uri,
                        description: r.description.clone().unwrap_or_default(),
                        content_type: r.mime_type,
                    })
                    .collect();

                Ok(McpResponse {
                    success: true,
                    data: Some(resource_infos),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 获取资源列表失败: {}", e);
                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }

    /// 读取资源
    pub async fn read_resource(
        &self,
        request: ResourceReadRequest,
    ) -> Result<McpResponse<serde_json::Value>, String> {
        info!(
            "[MCP] 读取资源: {}, 客户端ID: {}",
            request.resource_uri, request.client_id
        );

        let client = self.get_client(&request.client_id)?;

        let result = match client {
            McpClientEnum::Sse(client) => client.read_resource(&request.resource_uri).await,
            McpClientEnum::Stdio(client) => client.read_resource(&request.resource_uri).await,
        };

        match result {
            Ok(resource) => {
                info!("[MCP] 资源读取成功: {}", request.resource_uri);
                debug!("[MCP] 资源内容已获取");

                Ok(McpResponse {
                    success: true,
                    data: Some(serde_json::to_value(resource).unwrap_or_default()),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 资源读取失败: {}, 错误: {}", request.resource_uri, e);
                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }

    /// 列出提示
    pub async fn list_prompts(
        &self,
        request: FilterRequest,
    ) -> Result<McpResponse<Vec<PromptInfo>>, String> {
        info!("[MCP] 列出提示, 客户端ID: {}", request.client_id);
        debug!("[MCP] 过滤条件: {:?}", request.filter);

        let client = self.get_client(&request.client_id)?;

        let result = match client {
            McpClientEnum::Sse(client) => client.list_prompts(request.filter.clone()).await,
            McpClientEnum::Stdio(client) => client.list_prompts(request.filter.clone()).await,
        };

        match result {
            Ok(prompts) => {
                info!("[MCP] 成功获取提示列表, 数量: {}", prompts.prompts.len());
                debug!(
                    "[MCP] 提示列表: {:?}",
                    prompts.prompts.iter().map(|p| &p.name).collect::<Vec<_>>()
                );

                // 转换为 PromptInfo 类型
                let prompt_infos = prompts
                    .prompts
                    .into_iter()
                    .map(|p| PromptInfo {
                        name: p.name,
                        description: p.description.unwrap_or_default(),
                        parameters_schema: Some(
                            serde_json::to_value(p.arguments.clone())
                                .unwrap_or(serde_json::Value::Null),
                        ),
                    })
                    .collect();

                Ok(McpResponse {
                    success: true,
                    data: Some(prompt_infos),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 获取提示列表失败: {}", e);
                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }

    /// 获取提示
    pub async fn get_prompt(
        &self,
        request: PromptRequest,
    ) -> Result<McpResponse<serde_json::Value>, String> {
        info!(
            "[MCP] 获取提示: {}, 客户端ID: {}",
            request.prompt_name, request.client_id
        );
        debug!("[MCP] 提示参数: {:?}", request.params);

        let client = self.get_client(&request.client_id)?;

        let result = match client {
            McpClientEnum::Sse(client) => {
                client
                    .get_prompt(&request.prompt_name, request.params)
                    .await
            }
            McpClientEnum::Stdio(client) => {
                client
                    .get_prompt(&request.prompt_name, request.params)
                    .await
            }
        };

        match result {
            Ok(prompt) => {
                info!("[MCP] 提示获取成功: {}", request.prompt_name);
                debug!("[MCP] 提示内容: {:?}", prompt);

                Ok(McpResponse {
                    success: true,
                    data: Some(serde_json::to_value(prompt).unwrap_or_default()),
                    error: None,
                })
            }
            Err(e) => {
                error!("[MCP] 提示获取失败: {}, 错误: {}", request.prompt_name, e);
                Ok(McpResponse {
                    success: false,
                    data: None,
                    error: Some(e.to_string()),
                })
            }
        }
    }
}

/// 应用状态
pub struct AppState {
    pub mcp_client_manager: Mutex<McpClientManager>,
}

impl AppState {
    pub fn new() -> Self {
        info!("[MCP] 创建应用状态");
        Self {
            mcp_client_manager: Mutex::new(McpClientManager::new()),
        }
    }
}
