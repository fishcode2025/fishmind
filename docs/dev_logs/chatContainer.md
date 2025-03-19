import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useMcpTool } from '../../contexts/McpToolContext';
import { McpToolHandler } from '../../services/chat/mcpToolHandler';
import McpToolPanel from './McpToolPanel';

// 假设这是聊天容器组件
const ChatContainer: React.FC = () => {
  // 使用MCP工具上下文
  const mcpToolContext = useMcpTool();
  
  // 创建工具处理器
  const [toolHandler] = useState(() => new McpToolHandler(mcpToolContext));
  
  // 处理大模型返回的消息
  const handleModelResponse = async (response: any) => {
    // 检查是否包含工具调用请求
    if (response.toolCalls && response.toolCalls.length > 0) {
      // 处理工具调用
      const results = await toolHandler.handleToolCalls(response.toolCalls);
      
      // 将结果发送回大模型
      // ...
    }
  };
  
  // 获取可用工具列表
  useEffect(() => {
    const loadTools = async () => {
      const tools = await toolHandler.getAvailableToolsForModel();
      console.log('可用工具列表:', tools);
      
      // 将工具列表添加到大模型请求中
      // ...
    };
    
    loadTools();
  }, [toolHandler]);
  
  // 处理工具调用结果
  const handleToolResult = (result: any) => {
    console.log('工具调用结果:', result);
    
    // 将结果添加到聊天消息中
    // ...
  };
  
  return (
    <Box>
      {/* 聊天界面 */}
      {/* ... */}
      
      {/* MCP工具面板 */}
      <McpToolPanel 
        configId="some-config-id" 
        onToolResult={handleToolResult} 
      />
    </Box>
  );
};

export default ChatContainer;



import React from 'react';
import { McpToolProvider } from './contexts/McpToolContext';
import { McpToolService } from './services/mcp/mcpToolService';
import { McpConfigService } from './services/mcp/mcpService';
import { McpServerConfigRepository } from './repositories/mcpServerConfigRepository';
import ChatContainer from './components/chat/ChatContainer';

// 假设这是应用入口组件
const App: React.FC = () => {
  // 创建服务实例
  const mcpRepository = new McpServerConfigRepository();
  const mcpService = new McpConfigService(mcpRepository);
  const mcpToolService = new McpToolService(mcpService);
  
  return (
    <McpToolProvider mcpToolService={mcpToolService}>
      <ChatContainer />
      {/* 其他组件 */}
    </McpToolProvider>
  );
};

export default App;