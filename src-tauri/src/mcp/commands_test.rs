#[cfg(test)]
mod tests {
    use super::*;

    use crate::mcp::client::{AppState, McpClientManager};
    use crate::mcp::commands::{
        call_mcp_tool, delete_mcp_client, disconnect_mcp_client, get_all_mcp_client_statuses,
        get_mcp_client_status, initialize_mcp_client, list_mcp_prompts, list_mcp_resources,
        list_mcp_tools, read_mcp_resource,
    };
    use crate::mcp::types::{
        ClientStatus, ClientStatusResponse, FilterRequest, InitializeClientRequest, McpResponse,
        PromptInfo, PromptRequest, ResourceInfo, ResourceReadRequest, ServerInfo, ToolCallRequest,
        ToolInfo, TransportType,
    };
    use std::collections::HashMap;
    use std::sync::Arc;
    use tauri::State;
    use tokio::sync::Mutex;

    // 创建测试用的 AppState
    fn create_test_app_state() -> Arc<AppState> {
        Arc::new(AppState {
            mcp_client_manager: Mutex::new(McpClientManager::new()),
        })
    }

    // 测试 initialize_mcp_client 方法
    #[tokio::test]
    async fn test_initialize_mcp_client() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 准备测试数据
        let request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        // 执行测试
        let result = {
            let mut manager = app_state.mcp_client_manager.lock().await;
            manager.initialize_client(request).await
        };

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to initialize client: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, client_id);
        // 使用模式匹配检查状态
        match status.status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(false, "Expected Connected status, got {:?}", status.status),
        }

        assert!(status.connected_at.is_some());
        assert!(status.server_info.is_some());
    }

    // 测试 get_all_mcp_client_statuses 方法
    #[tokio::test]
    async fn test_get_all_mcp_client_statuses() {
        let app_state = create_test_app_state();

        // 先初始化一个客户端
        let client_id = "test-client".to_string();
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试获取所有状态
        let statuses = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.get_all_client_statuses()
        };

        // 验证结果
        assert_eq!(
            statuses.len(),
            1,
            "Expected 1 client, got {}",
            statuses.len()
        );
        assert_eq!(statuses[0].id, client_id);
        match statuses[0].status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(
                false,
                "Expected Connected status, got {:?}",
                statuses[0].status
            ),
        }
    }

    // 测试 disconnect_mcp_client 方法
    #[tokio::test]
    async fn test_disconnect_mcp_client() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试断开连接
        let result = {
            let mut manager = app_state.mcp_client_manager.lock().await;
            manager.disconnect_client(&client_id).await
        };

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to disconnect client: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, client_id);
        match status.status {
            ClientStatus::Disconnected => assert!(true),
            _ => assert!(
                false,
                "Expected Disconnected status, got {:?}",
                status.status
            ),
        }
    }

    // 测试 delete_mcp_client 方法
    #[tokio::test]
    async fn test_delete_mcp_client() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试删除客户端
        let result = {
            let mut manager = app_state.mcp_client_manager.lock().await;
            manager.delete_client(&client_id).await
        };

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to delete client: {:?}",
            result.err()
        );

        // 验证客户端已被删除
        let status_result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.get_client_status(&client_id)
        };
        assert!(status_result.is_err(), "Client should have been deleted");
    }

    // 测试 get_mcp_client_status 方法
    #[tokio::test]
    async fn test_get_mcp_client_status() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试获取状态
        let result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.get_client_status(&client_id)
        };

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to get client status: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, client_id);
        match status.status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(false, "Expected Connected status, got {:?}", status.status),
        }
    }

    // 测试 list_mcp_tools 方法
    #[tokio::test]
    async fn test_list_mcp_tools() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试列出工具
        let request = FilterRequest {
            client_id: client_id.clone(),
            filter: None,
        };

        let result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.list_tools(request).await
        };

        // 验证结果
        assert!(result.is_ok(), "Failed to list tools: {:?}", result.err());
    }

    // 测试 call_mcp_tool 方法
    #[tokio::test]
    async fn test_call_mcp_tool() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 先列出工具
        let tools_request = FilterRequest {
            client_id: client_id.clone(),
            filter: None,
        };

        let tools_result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.list_tools(tools_request).await
        };

        // 如果有工具，则调用第一个工具
        if let Ok(tools_response) = tools_result {
            if let Some(tools) = tools_response.data {
                if let Some(tool) = tools.first() {
                    // 测试调用工具
                    let request = ToolCallRequest {
                        client_id: client_id.clone(),
                        tool_name: tool.name.clone(),
                        params: serde_json::json!({}),
                    };

                    let result = {
                        let manager = app_state.mcp_client_manager.lock().await;
                        manager.call_tool(request).await
                    };

                    // 验证结果
                    assert!(result.is_ok(), "Failed to call tool: {:?}", result.err());
                }
            }
        }
    }

    // 测试 list_mcp_resources 方法
    #[tokio::test]
    async fn test_list_mcp_resources() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试列出资源
        let request = FilterRequest {
            client_id: client_id.clone(),
            filter: None,
        };

        let result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.list_resources(request).await
        };

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to list resources: {:?}",
            result.err()
        );
    }

    // 测试 read_mcp_resource 方法
    #[tokio::test]
    async fn test_read_mcp_resource() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 先列出资源
        let resources_request = FilterRequest {
            client_id: client_id.clone(),
            filter: None,
        };

        let resources_result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.list_resources(resources_request).await
        };

        // 如果有资源，则读取第一个资源
        if let Ok(resources_response) = resources_result {
            if let Some(resources) = resources_response.data {
                if let Some(resource) = resources.first() {
                    // 测试读取资源
                    let request = ResourceReadRequest {
                        client_id: client_id.clone(),
                        resource_uri: resource.uri.clone(),
                    };

                    let result = {
                        let manager = app_state.mcp_client_manager.lock().await;
                        manager.read_resource(request).await
                    };

                    // 验证结果
                    assert!(
                        result.is_ok(),
                        "Failed to read resource: {:?}",
                        result.err()
                    );
                }
            }
        }
    }

    // 测试 list_mcp_prompts 方法
    #[tokio::test]
    async fn test_list_mcp_prompts() {
        let app_state = create_test_app_state();
        let client_id = "test-client".to_string();

        // 先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: client_id.clone(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };

        {
            let mut manager = app_state.mcp_client_manager.lock().await;
            let _ = manager.initialize_client(init_request).await;
        }

        // 测试列出提示
        let request = FilterRequest {
            client_id: client_id.clone(),
            filter: None,
        };

        let result = {
            let manager = app_state.mcp_client_manager.lock().await;
            manager.list_prompts(request).await
        };

        // 验证结果
        assert!(result.is_ok(), "Failed to list prompts: {:?}", result.err());
    }
}
