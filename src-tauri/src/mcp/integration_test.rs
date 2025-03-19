#[cfg(test)]
mod integration_tests {
    use crate::mcp::client::McpClientManager;
    use crate::mcp::types::{
        ClientStatus, FilterRequest, InitializeClientRequest, PromptRequest, ResourceReadRequest,
        ToolCallRequest, TransportType,
    };
    use std::collections::HashMap;

    // 注意：这个测试需要一个实际运行的MCP服务器
    // 可以在测试前启动一个本地服务器，或者使用一个测试环境的服务器
    // 这里我们假设有一个可用的服务器运行在localhost:8080

    #[tokio::test]
    async fn test_full_mcp_client_lifecycle() {
        // 创建客户端管理器
        let mut manager = McpClientManager::new();

        // 1. 初始化客户端
        let client_id = "integration-test-client";
        let init_request = InitializeClientRequest {
            id: client_id.to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![
                "--db".to_string(),
                "C:\\Users\\daiwj\\test.db".to_string(),
            ]),
            timeout_secs: Some(30),
            client_name: "integration-test".to_string(),
            client_version: "1.0.0".to_string(),
        };

        let init_result = manager.initialize_client(init_request).await;
        assert!(
            init_result.is_ok(),
            "Failed to initialize client: {:?}",
            init_result.err()
        );

        let status = init_result.unwrap();
        assert_eq!(status.id, client_id);
        match status.status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(false, "Expected Connected status, got {:?}", status.status),
        };
        assert!(status.server_info.is_some());

        // 2. 列出工具
        println!("\n===== 开始测试列出工具 =====");
        let tools_request = FilterRequest {
            client_id: client_id.to_string(),
            filter: None,
        };

        let tools_result = manager.list_tools(tools_request).await;
        assert!(
            tools_result.is_ok(),
            "Failed to list tools: {:?}",
            tools_result.err()
        );

        let tools_response = tools_result.unwrap();
        assert!(tools_response.success);
        assert!(tools_response.data.is_some());
        println!(
            "找到 {} 个工具",
            tools_response.data.as_ref().map_or(0, |tools| tools.len())
        );
        if let Some(tools) = &tools_response.data {
            for (i, tool) in tools.iter().enumerate() {
                println!("  工具 {}: {}", i + 1, tool.name);
            }
        }
        println!("===== 工具列出测试完成 =====\n");

        // 3. 调用工具（如果有可用的工具）
        println!("\n===== 开始测试调用工具 =====");
        if let Some(tools) = &tools_response.data {
            if let Some(tool) = tools.first() {
                println!("尝试调用工具: {}", tool.name);
                let tool_call_request = ToolCallRequest {
                    client_id: client_id.to_string(),
                    tool_name: tool.name.clone(),
                    params: serde_json::json!({"query":"select * from products"}),
                };

                let call_result = manager.call_tool(tool_call_request).await;
                assert!(
                    call_result.is_ok(),
                    "Failed to call tool: {:?}",
                    call_result.err()
                );

                let call_response = call_result.unwrap();
                assert!(call_response.success);
                println!(
                    "工具调用结果: {}",
                    serde_json::to_string_pretty(&call_response.data)
                        .unwrap_or_else(|_| "无法格式化结果".to_string())
                );
            }
        } else {
            println!("没有可用的工具可以调用");
        }
        println!("===== 工具调用测试完成 =====\n");

        // 4. 列出资源
        println!("\n===== 开始测试列出资源 =====");
        let resources_request = FilterRequest {
            client_id: client_id.to_string(),
            filter: None,
        };

        let resources_result = manager.list_resources(resources_request).await;
        assert!(
            resources_result.is_ok(),
            "Failed to list resources: {:?}",
            resources_result.err()
        );

        let resources_response = resources_result.unwrap();
        assert!(resources_response.success);
        assert!(resources_response.data.is_some());
        println!(
            "找到 {} 个资源",
            resources_response
                .data
                .as_ref()
                .map_or(0, |resources| resources.len())
        );
        if let Some(resources) = &resources_response.data {
            for (i, resource) in resources.iter().enumerate() {
                println!("  资源 {}: {}", i + 1, resource.uri);
            }
        }
        println!("===== 资源列出测试完成 =====\n");

        // 5. 读取资源（如果有可用的资源）
        println!("\n===== 开始测试读取资源 =====");
        if let Some(resources) = &resources_response.data {
            if let Some(resource) = resources.first() {
                println!("尝试读取资源: {}", resource.uri);
                let resource_read_request = ResourceReadRequest {
                    client_id: client_id.to_string(),
                    resource_uri: resource.uri.clone(),
                };

                let read_result = manager.read_resource(resource_read_request).await;
                assert!(
                    read_result.is_ok(),
                    "Failed to read resource: {:?}",
                    read_result.err()
                );

                let read_response = read_result.unwrap();
                assert!(read_response.success);
                println!(
                    "资源内容: {}",
                    serde_json::to_string_pretty(&read_response.data)
                        .unwrap_or_else(|_| "无法格式化内容".to_string())
                );
            }
        } else {
            println!("没有可用的资源可以读取");
        }
        println!("===== 资源读取测试完成 =====\n");

        // 6. 断开客户端连接
        println!("\n===== 开始测试断开连接 =====");
        let disconnect_result = manager.disconnect_client(client_id).await;
        assert!(
            disconnect_result.is_ok(),
            "Failed to disconnect client: {:?}",
            disconnect_result.err()
        );

        let disconnect_status = disconnect_result.unwrap();
        assert_eq!(disconnect_status.id, client_id);
        match disconnect_status.status {
            ClientStatus::Disconnected => assert!(true),
            _ => assert!(
                false,
                "Expected Disconnected status, got {:?}",
                disconnect_status.status
            ),
        };

        // 7. 删除客户端
        let delete_result = manager.delete_client(client_id).await;
        assert!(
            delete_result.is_ok(),
            "Failed to delete client: {:?}",
            delete_result.err()
        );

        // 验证客户端已被删除
        let status_result = manager.get_client_status(client_id);
        assert!(status_result.is_err());
    }
}
