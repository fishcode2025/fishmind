import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, useThemeContext } from "./contexts/ThemeContext";
import MainLayout from "./components/layout/MainLayout";
import SettingsPage from "./pages/Settings";
import Chat from "./pages/Chat";
import TestPage from "./pages/TestPage";
import {
  CssBaseline,
  GlobalStyles,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { testConfig } from "./services/test/ConfigTest";
import { directoryService } from "./services/system/DirectoryService";
import { configService } from "./services/system/ConfigService";
import SettingsLayout from "./components/settings/SettingsLayout";
import { ServiceContainer } from "./services/ServiceContainer";
import { ConfigService } from "./services/config/ConfigService";
import { SQLiteService } from "./services/database/SQLiteService";
import { ConfigRepository } from "./repositories/ConfigRepository";
import { AiModelService } from "./services/aimodel/AiModelService";
import { AiModelProviderRepository } from "./repositories/AiModelProviderRepository";
import { AiModelRepository } from "./repositories/AiModelRepository";
import { ChatService } from "./services/chat/ChatService";
import { ChatTopicRepository } from "./repositories/ChatTopicRepository";
import { ChatMessageRepository } from "./repositories/ChatMessageRepository";
import { AssistantRepository } from "./repositories";
import { SERVICE_KEYS } from "./services/constants";
import { McpConfigService } from "./services/mcp/mcpService";
import { McpServerConfigRepository } from "./repositories/McpServerConfigRepository";
import { McpToolService } from "./services/mcp/mcpToolService";
import McpToolProvider from "./contexts/McpToolContext";

// 临时的页面组件，后续会替换为实际页面
const AssistantsPage = () => <div>助手管理页面</div>;
const KnowledgePage = () => <div>知识库页面</div>;
// const FilesPage = () => <div>文件管理页面</div>;
// const TranslationPage = () => <div>翻译页面</div>;
// const DrawingPage = () => <div>AI绘画页面</div>;
// const AppsPage = () => <div>小程序页面</div>;

// 应用路由组件
const AppRoutes = () => {
  const { toggleTheme, themeMode } = useThemeContext();
  const serviceContainer = ServiceContainer.getInstance();
  const mcpToolService = serviceContainer.getMcpToolService();

  return (
    <McpToolProvider mcpToolService={mcpToolService}>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <MainLayout toggleTheme={toggleTheme} themeMode={themeMode} />
            }
          >
            <Route index element={<Chat />} />
            <Route path="assistants" element={<AssistantsPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            {/* <Route path="files" element={<FilesPage />} />
            <Route path="translation" element={<TranslationPage />} />
            <Route path="drawing" element={<DrawingPage />} />
            <Route path="apps" element={<AppsPage />} /> */}
            <Route path="settings" element={<SettingsLayout />} />
            <Route path="test" element={<TestPage />} />
          </Route>
        </Routes>
      </Router>
    </McpToolProvider>
  );
};

// 主应用组件
const App = () => {
  // 添加加载状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. 创建服务容器
        const serviceContainer = ServiceContainer.getInstance();

        // 2. 首先初始化数据库服务
        const dbService = new SQLiteService();
        serviceContainer.register(SERVICE_KEYS.DATABASE, dbService);
        await dbService.initialize(); // 确保数据库先初始化

        // 3. 初始化配置服务（依赖数据库）
        const configRepository = new ConfigRepository(dbService);
        const configService = new ConfigService(configRepository, dbService);
        serviceContainer.register(SERVICE_KEYS.CONFIG, configService);
        await configService.initialize();

        // 4. 初始化 AI 模型服务（依赖配置和数据库）
        const providerRepository = new AiModelProviderRepository(dbService);
        const modelRepository = new AiModelRepository(dbService);
        const aiModelService = new AiModelService(
          providerRepository,
          modelRepository,
          configRepository
        );
        serviceContainer.register(SERVICE_KEYS.AI_MODEL, aiModelService);
        await aiModelService.initialize();

        // 5. 初始化聊天服务（依赖前面所有服务）
        const topicRepository = new ChatTopicRepository(dbService);
        const messageRepository = new ChatMessageRepository(dbService);
        const assistantRepository = new AssistantRepository(dbService);

        // 6. 初始化MCP服务
        const mcpRepository = new McpServerConfigRepository(dbService);
        const mcpService = new McpConfigService(mcpRepository);
        serviceContainer.register(SERVICE_KEYS.MCP, mcpService);
        await mcpService.initialize();

        // 7. 初始化MCP工具服务
        const mcpToolService = new McpToolService(mcpService);
        serviceContainer.register(SERVICE_KEYS.MCP_TOOL, mcpToolService);
        await mcpToolService.initialize();

        // 8. 初始化聊天服务（现在依赖 MCP 工具服务）
        const chatService = new ChatService(
          topicRepository,
          messageRepository,
          aiModelService,
          assistantRepository,
          mcpToolService
        );
        serviceContainer.register(SERVICE_KEYS.CHAT, chatService);
        await chatService.initialize();

        // 所有服务初始化完成后
        setIsInitialized(true);
      } catch (error) {
        console.error("应用初始化失败:", error);
        setInitError(error instanceof Error ? error.message : "应用初始化失败");
      }
    };

    initializeApp();
  }, []);

  // 如果还在初始化中，显示加载界面
  if (!isInitialized) {
    return (
      <ThemeProvider>
        <CssBaseline />
        <Box
          sx={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {initError ? (
            // 显示错误信息
            <Typography color="error">{initError}</Typography>
          ) : (
            // 显示加载动画
            <>
              <CircularProgress />
              <Typography>正在初始化应用...</Typography>
            </>
          )}
        </Box>
      </ThemeProvider>
    );
  }

  // 服务初始化完成后渲染主应用
  return (
    <ThemeProvider>
      <CssBaseline />
      <GlobalStyles
        styles={{
          "html, body": {
            height: "100vh",
            width: "100vw",
            margin: 0,
            padding: 0,
            overflow: "hidden",
          },
          "#root": {
            height: "100vh",
            width: "100vw",
            overflow: "hidden",
          },
          "*::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "4px",
          },
          "*::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
        }}
      />
      <AppRoutes />
    </ThemeProvider>
  );
};

export default App;
