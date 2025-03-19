import React, { useEffect, useState, useContext } from "react";
import { IMcpToolService } from "../services/interfaces";
import { ToolInfo, ResourceInfo, PromptInfo } from "../models/mcpToolTypes";

interface McpToolContextProps {
  mcpToolService: IMcpToolService;
  children: React.ReactNode;
}

const McpToolContext = React.createContext<{
  availableTools: Record<string, ToolInfo[]>;
  loadTools: (configId: string) => Promise<ToolInfo[]>;
  callTool: (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ) => Promise<any>;
  refreshTools: (configId: string) => Promise<ToolInfo[]>;
  availableResources: Record<string, ResourceInfo[]>;
  loadResources: (configId: string) => Promise<ResourceInfo[]>;
  readResource: (configId: string, resourceUri: string) => Promise<any>;
  refreshResources: (configId: string) => Promise<ResourceInfo[]>;
  availablePrompts: Record<string, PromptInfo[]>;
  loadPrompts: (configId: string) => Promise<PromptInfo[]>;
  getPrompt: (
    configId: string,
    promptName: string,
    params: Record<string, any>
  ) => Promise<any>;
  refreshPrompts: (configId: string) => Promise<PromptInfo[]>;
  isLoading: boolean;
  error: string | null;
}>({
  availableTools: {},
  loadTools: async () => [],
  callTool: async () => {},
  refreshTools: async () => [],
  availableResources: {},
  loadResources: async () => [],
  readResource: async () => {},
  refreshResources: async () => [],
  availablePrompts: {},
  loadPrompts: async () => [],
  getPrompt: async () => {},
  refreshPrompts: async () => [],
  isLoading: false,
  error: null,
});

const McpToolProvider: React.FC<McpToolContextProps> = ({
  mcpToolService,
  children,
}) => {
  // 状态
  const [availableTools, setAvailableTools] = useState<
    Record<string, ToolInfo[]>
  >({});
  const [availableResources, setAvailableResources] = useState<
    Record<string, ResourceInfo[]>
  >({});
  const [availablePrompts, setAvailablePrompts] = useState<
    Record<string, PromptInfo[]>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化时加载所有可用工具、资源和提示
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 并行加载所有数据
        const [tools, resources, prompts] = await Promise.all([
          mcpToolService.getAllAvailableTools(),
          mcpToolService.getAllAvailableResources(),
          mcpToolService.getAllAvailablePrompts(),
        ]);

        setAvailableTools(tools);
        setAvailableResources(resources);
        setAvailablePrompts(prompts);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "加载MCP数据失败";
        setError(errorMessage);
        console.error("加载MCP数据失败:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, [mcpToolService]);

  // 加载工具列表
  const loadTools = async (configId: string): Promise<ToolInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const tools = await mcpToolService.listTools(configId);

      setAvailableTools((prev) => ({
        ...prev,
        [configId]: tools,
      }));

      return tools;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "加载工具列表失败";
      setError(errorMessage);
      console.error("加载工具列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 调用工具
  const callTool = async (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      return await mcpToolService.callTool(configId, toolName, params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "调用工具失败";
      setError(errorMessage);
      console.error(`调用工具 ${toolName} 失败:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新工具列表
  const refreshTools = async (configId: string): Promise<ToolInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const tools = await mcpToolService.refreshTools(configId);

      setAvailableTools((prev) => ({
        ...prev,
        [configId]: tools,
      }));

      return tools;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "刷新工具列表失败";
      setError(errorMessage);
      console.error("刷新工具列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 加载资源列表
  const loadResources = async (configId: string): Promise<ResourceInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const resources = await mcpToolService.listResources(configId);

      setAvailableResources((prev) => ({
        ...prev,
        [configId]: resources,
      }));

      return resources;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "加载资源列表失败";
      setError(errorMessage);
      console.error("加载资源列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 读取资源
  const readResource = async (
    configId: string,
    resourceUri: string
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      return await mcpToolService.readResource(configId, resourceUri);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "读取资源失败";
      setError(errorMessage);
      console.error(`读取资源 ${resourceUri} 失败:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新资源列表
  const refreshResources = async (
    configId: string
  ): Promise<ResourceInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const resources = await mcpToolService.refreshResources(configId);

      setAvailableResources((prev) => ({
        ...prev,
        [configId]: resources,
      }));

      return resources;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "刷新资源列表失败";
      setError(errorMessage);
      console.error("刷新资源列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 加载提示列表
  const loadPrompts = async (configId: string): Promise<PromptInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const prompts = await mcpToolService.listPrompts(configId);

      setAvailablePrompts((prev) => ({
        ...prev,
        [configId]: prompts,
      }));

      return prompts;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "加载提示列表失败";
      setError(errorMessage);
      console.error("加载提示列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 获取提示
  const getPrompt = async (
    configId: string,
    promptName: string,
    params: Record<string, any>
  ): Promise<any> => {
    setIsLoading(true);
    setError(null);
    try {
      return await mcpToolService.getPrompt(configId, promptName, params);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "获取提示失败";
      setError(errorMessage);
      console.error(`获取提示 ${promptName} 失败:`, err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新提示列表
  const refreshPrompts = async (configId: string): Promise<PromptInfo[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const prompts = await mcpToolService.refreshPrompts(configId);

      setAvailablePrompts((prev) => ({
        ...prev,
        [configId]: prompts,
      }));

      return prompts;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "刷新提示列表失败";
      setError(errorMessage);
      console.error("刷新提示列表失败:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // 上下文值
  const value = {
    // 工具相关
    availableTools,
    loadTools,
    callTool,
    refreshTools,

    // 资源相关
    availableResources,
    loadResources,
    readResource,
    refreshResources,

    // 提示相关
    availablePrompts,
    loadPrompts,
    getPrompt,
    refreshPrompts,

    // 状态
    isLoading,
    error,
  };

  return (
    <McpToolContext.Provider value={value}>{children}</McpToolContext.Provider>
  );
};

// 创建自定义钩子以便于使用上下文
export const useMcpTool = () => useContext(McpToolContext);

export { McpToolContext };
export default McpToolProvider;
