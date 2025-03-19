#[cfg(test)]
mod tests {
    use super::*;
    use crate::mcp::client::McpClientManager;
    use crate::mcp::types::{
        ClientStatus, FilterRequest, InitializeClientRequest, PromptRequest, ResourceReadRequest,
        ToolCallRequest, TransportType,
    };
    use mcp_client_fishcode2025::{McpClient, McpService};
    use mockall::predicate::*;
    use mockall::*;
    use serde_json;
    use std::collections::HashMap;

    // 创建 MockMcpClient 用于测试
    mock! {
        McpClient<T> {
            async fn initialize(&self) -> Result<serde_json::Value, String>;
            async fn list_tools<'a>(&self, filter: Option<&'a str>) -> Result<Vec<serde_json::Value>, String>;
            async fn call_tool<'a>(&self, name: &'a str, parameters: Option<serde_json::Value>) -> Result<serde_json::Value, String>;
            async fn list_resources<'a>(&self, filter: Option<&'a str>) -> Result<Vec<serde_json::Value>, String>;
            async fn read_resource<'a>(&self, id: &'a str) -> Result<serde_json::Value, String>;
            async fn list_prompts<'a>(&self, filter: Option<&'a str>) -> Result<Vec<serde_json::Value>, String>;
            async fn get_prompt<'a>(&self, id: &'a str) -> Result<serde_json::Value, String>;
        }
    }

    // 测试 initialize_client 方法
    #[tokio::test]
    async fn test_initialize_client() {
        // 准备测试数据
        let mut manager = McpClientManager::new();
        let request = InitializeClientRequest {
            id: "test-client".to_string(),
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
        let result = manager.initialize_client(request).await;

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to initialize client: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, "test-client");
        // 使用模式匹配检查状态
        match status.status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(false, "Expected Connected status, got {:?}", status.status),
        }

        assert!(status.connected_at.is_some());
        assert!(status.server_info.is_some());
    }

    // 其他测试也标记为忽略
    #[tokio::test]
    async fn test_disconnect_client() {
        // 准备测试数据和初始化客户端
        let mut manager = McpClientManager::new();
        // 首先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: "test-client".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result = manager.initialize_client(init_request).await;
        assert!(
            init_result.is_ok(),
            "Failed to initialize client: {:?}",
            init_result.err()
        );

        // 执行断开连接测试
        let result = manager.disconnect_client("test-client").await;

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to disconnect client: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, "test-client");

        // 使用模式匹配检查状态
        match status.status {
            ClientStatus::Disconnected => assert!(true),
            _ => assert!(
                false,
                "Expected Disconnected status, got {:?}",
                status.status
            ),
        }
    }

    #[tokio::test]
    async fn test_delete_client() {
        // 准备测试数据和初始化客户端
        let mut manager = McpClientManager::new();
        // 首先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: "test-client".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result = manager.initialize_client(init_request).await;
        assert!(
            init_result.is_ok(),
            "Failed to initialize client: {:?}",
            init_result.err()
        );

        // 执行删除客户端测试
        let result = manager.delete_client("test-client").await;

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to delete client: {:?}",
            result.err()
        );
        // 验证客户端已被删除
        let status_result = manager.get_client_status("test-client");
        assert!(status_result.is_err(), "Client should have been deleted");
    }

    #[tokio::test]
    async fn test_get_client_status() {
        // 准备测试数据和初始化客户端
        let mut manager = McpClientManager::new();
        // 首先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: "test-client".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result = manager.initialize_client(init_request).await;
        assert!(
            init_result.is_ok(),
            "Failed to initialize client: {:?}",
            init_result.err()
        );

        // 执行获取状态测试
        let result = manager.get_client_status("test-client");

        // 验证结果
        assert!(
            result.is_ok(),
            "Failed to get client status: {:?}",
            result.err()
        );
        let status = result.unwrap();
        assert_eq!(status.id, "test-client");
        // 使用模式匹配检查状态
        match status.status {
            ClientStatus::Connected => assert!(true),
            _ => assert!(false, "Expected Connected status, got {:?}", status.status),
        }
    }

    #[tokio::test]
    async fn test_get_all_client_statuses() {
        // 准备测试数据和初始化多个客户端
        let mut manager = McpClientManager::new();

        // 初始化第一个客户端
        let init_request1 = InitializeClientRequest {
            id: "client1".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "client1".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result1 = manager.initialize_client(init_request1).await;
        assert!(
            init_result1.is_ok(),
            "Failed to initialize client1: {:?}",
            init_result1.err()
        );

        // 初始化第二个客户端
        let init_request2 = InitializeClientRequest {
            id: "client2".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "client2".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result2 = manager.initialize_client(init_request2).await;
        assert!(
            init_result2.is_ok(),
            "Failed to initialize client2: {:?}",
            init_result2.err()
        );

        // 执行获取所有状态测试
        let statuses = manager.get_all_client_statuses();

        // 验证结果
        assert_eq!(
            statuses.len(),
            2,
            "Expected 2 clients, got {}",
            statuses.len()
        );
        assert!(
            statuses.iter().any(|s| s.id == "client1"),
            "client1 not found in statuses"
        );
        assert!(
            statuses.iter().any(|s| s.id == "client2"),
            "client2 not found in statuses"
        );
    }

    #[tokio::test]
    async fn test_list_tools() {
        // 准备测试数据和初始化客户端
        let mut manager = McpClientManager::new();
        // 首先初始化一个客户端
        let init_request = InitializeClientRequest {
            id: "test-client".to_string(),
            transport_type: TransportType::Stdio,
            sse_url: None,
            headers: Some(HashMap::new()),
            command: Some("./src/mcp/mcp-sqlite.exe".to_string()),
            args: Some(vec![]),
            timeout_secs: Some(30),
            client_name: "test-client".to_string(),
            client_version: "1.0.0".to_string(),
        };
        let init_result = manager.initialize_client(init_request).await;
        assert!(
            init_result.is_ok(),
            "Failed to initialize client: {:?}",
            init_result.err()
        );

        // 执行列出工具测试
        let request = FilterRequest {
            client_id: "test-client".to_string(),
            filter: None,
        };
        let result = manager.list_tools(request).await;

        // 验证结果
        assert!(result.is_ok(), "Failed to list tools: {:?}", result.err());
        let response = result.unwrap();
        assert!(response.success, "Response indicates failure");
        assert!(response.data.is_some(), "No data returned in response");
        // 根据实际情况验证工具列表
        if let Some(tools) = response.data {
            println!("Found {} tools", tools.len());
            for tool in tools {
                println!("Tool: {}", tool.name);
            }
        }
    }

    // 更多测试用例...
    // 可以添加对 call_tool, list_resources, read_resource, list_prompts, get_prompt 等方法的测试
}
