import { invoke } from '@tauri-apps/api/core';
import { IMcpToolService, IMcpService } from '../interfaces';
import { 
  ToolInfo, 
  ResourceInfo, 
  PromptInfo, 
  McpResponse,
  FilterRequest,
  ToolCallRequest,
  ResourceReadRequest,
  PromptRequest
} from '../../models/mcpTypes';
import { ClientStatus } from '../../models/mcpTypes';

/**
 * MCP工具服务实现
 * 负责管理与MCP工具、资源和提示相关的操作
 */
export class McpToolService implements IMcpToolService {
  // 缓存
  private toolsCache: Record<string, ToolInfo[]> = {};
  private resourcesCache: Record<string, ResourceInfo[]> = {};
  private promptsCache: Record<string, PromptInfo[]> = {};
  
  /**
   * 构造函数
   * @param mcpService MCP服务实例，用于获取连接状态
   */
  constructor(private mcpService: IMcpService) {}

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    console.log('初始化MCP工具服务...');
    // 初始化缓存
    this.toolsCache = {};
    this.resourcesCache = {};
    this.promptsCache = {};
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    console.log('释放MCP工具服务资源...');
    // 清理缓存
    this.toolsCache = {};
    this.resourcesCache = {};
    this.promptsCache = {};
  }

  /**
   * 列出指定MCP客户端提供的工具
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 工具列表
   */
  async listTools(configId: string, filter?: Record<string, any>): Promise<ToolInfo[]> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`获取MCP工具列表, 配置ID: ${configId}`);
      
      // 如果缓存中有数据，直接返回
      if (this.toolsCache[configId]) {
        console.log(`使用缓存的工具列表, 配置ID: ${configId}`);
        return this.toolsCache[configId];
      }
      
      // 构建请求
      const request: FilterRequest = {
        client_id: configId,
        filter: filter ? JSON.stringify(filter) : ''
      };
      
      // 调用Rust后端
      const response = await invoke<McpResponse<ToolInfo[]>>('list_mcp_tools', { request });
      console.log('获取工具列表结果:', response);
      
      if (response.success) {
        // 更新缓存
        this.toolsCache[configId] = response.data || [];
        return this.toolsCache[configId];
      } else {
        throw new Error(response.error || '获取工具列表失败');
      }
    } catch (error) {
      console.error(`获取MCP工具列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 调用指定MCP客户端的工具
   * @param configId MCP客户端配置ID
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具调用结果
   */
  async callTool(configId: string, toolName: string, params: Record<string, any>): Promise<any> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`调用MCP工具: ${toolName}, 配置ID: ${configId}`);
      
      // 构建请求
      const request: ToolCallRequest = {
        client_id: configId,
        tool_name: toolName,
        params: params || {}
      };
      console.log(`调用MCP工具请求: ${JSON.stringify(request)}`);
      
      // 添加更详细的日志
      console.log(`准备调用Rust后端函数 call_mcp_tool，参数:`, { request });
      
      try {
        // 调用Rust后端
        const response = await invoke<McpResponse<any>>('call_mcp_tool', { request });
        console.log(`工具 ${toolName} 调用结果:`, response);
        
        if (response.success) {
          return response.data;
        } else {
          console.error(`工具调用返回错误: ${response.error}`);
          throw new Error(response.error || '工具调用失败');
        }
      } catch (invokeError) {
        console.error(`调用 invoke 函数失败:`, invokeError);
        throw invokeError;
      }
    } catch (error) {
      console.error(`调用MCP工具失败(ID: ${configId}, 工具: ${toolName}):`, error);
      throw error;
    } finally {
      console.log(`MCP工具调用过程完成: ${toolName}`);
    }
  }

  /**
   * 列出指定MCP客户端提供的资源
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 资源列表
   */
  async listResources(configId: string, filter?: Record<string, any>): Promise<ResourceInfo[]> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`获取MCP资源列表, 配置ID: ${configId}`);
      
      // 如果缓存中有数据，直接返回
      if (this.resourcesCache[configId]) {
        console.log(`使用缓存的资源列表, 配置ID: ${configId}`);
        return this.resourcesCache[configId];
      }
      
      // 构建请求
      const request: FilterRequest = {
        client_id: configId,
        filter: filter ? JSON.stringify(filter) : ''
      };
      
      // 调用Rust后端
      const response = await invoke<McpResponse<ResourceInfo[]>>('list_mcp_resources', { request });
      console.log('获取资源列表结果:', response);
      
      if (response.success) {
        // 更新缓存
        this.resourcesCache[configId] = response.data || [];
        return this.resourcesCache[configId];
      } else {
        throw new Error(response.error || '获取资源列表失败');
      }
    } catch (error) {
      console.error(`获取MCP资源列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 读取指定MCP客户端的资源
   * @param configId MCP客户端配置ID
   * @param resourceUri 资源URI
   * @returns 资源内容
   */
  async readResource(configId: string, resourceUri: string): Promise<any> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`读取MCP资源: ${resourceUri}, 配置ID: ${configId}`);
      
      // 构建请求
      const request: ResourceReadRequest = {
        client_id: configId,
        resource_uri: resourceUri
      };
      
      // 调用Rust后端
      const response = await invoke<McpResponse<any>>('read_mcp_resource', { request });
      console.log(`资源 ${resourceUri} 读取结果:`, response);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || '资源读取失败');
      }
    } catch (error) {
      console.error(`读取MCP资源失败(ID: ${configId}, 资源: ${resourceUri}):`, error);
      throw error;
    }
  }

  /**
   * 列出指定MCP客户端提供的提示
   * @param configId MCP客户端配置ID
   * @param filter 可选的过滤条件
   * @returns 提示列表
   */
  async listPrompts(configId: string, filter?: Record<string, any>): Promise<PromptInfo[]> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`获取MCP提示列表, 配置ID: ${configId}`);
      
      // 如果缓存中有数据，直接返回
      if (this.promptsCache[configId]) {
        console.log(`使用缓存的提示列表, 配置ID: ${configId}`);
        return this.promptsCache[configId];
      }
      
      // 构建请求
      const request: FilterRequest = {
        client_id: configId,
        filter: filter ? JSON.stringify(filter) : ''
      };
      
      // 调用Rust后端
      const response = await invoke<McpResponse<PromptInfo[]>>('list_mcp_prompts', { request });
      console.log('获取提示列表结果:', response);
      
      if (response.success) {
        // 更新缓存
        this.promptsCache[configId] = response.data || [];
        return this.promptsCache[configId];
      } else {
        throw new Error(response.error || '获取提示列表失败');
      }
    } catch (error) {
      console.error(`获取MCP提示列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 获取指定MCP客户端的提示
   * @param configId MCP客户端配置ID
   * @param promptName 提示名称
   * @param params 提示参数
   * @returns 提示内容
   */
  async getPrompt(configId: string, promptName: string, params: Record<string, any>): Promise<any> {
    try {
      // 确保MCP客户端已连接
      await this.ensureClientConnected(configId);
      
      console.log(`获取MCP提示: ${promptName}, 配置ID: ${configId}`);
      
      // 构建请求
      const request: PromptRequest = {
        client_id: configId,
        prompt_name: promptName,
        params: params || {}
      };
      
      // 调用Rust后端
      const response = await invoke<McpResponse<any>>('get_mcp_prompt', { request });
      console.log(`提示 ${promptName} 获取结果:`, response);
      
      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || '提示获取失败');
      }
    } catch (error) {
      console.error(`获取MCP提示失败(ID: ${configId}, 提示: ${promptName}):`, error);
      throw error;
    }
  }

  /**
   * 获取指定MCP客户端的所有可用工具
   * @returns 按客户端ID分组的工具映射
   */
  async getAllAvailableTools(): Promise<Record<string, ToolInfo[]>> {
    try {
      console.log('获取所有可用MCP工具');
      
      // 获取所有已启用的MCP配置
      const configs = await this.mcpService.getAllConfigs();
      const enabledConfigs = configs.filter(config => config.enabled);
      
      // 并行获取所有配置的工具列表
      const toolsPromises = enabledConfigs.map(async (config) => {
        try {
          const tools = await this.listTools(config.id);
          return { id: config.id, tools };
        } catch (error) {
          console.error(`获取配置 ${config.id} 的工具列表失败:`, error);
          return { id: config.id, tools: [] };
        }
      });
      
      const results = await Promise.all(toolsPromises);
      
      // 构建结果映射
      const toolsMap: Record<string, ToolInfo[]> = {};
      results.forEach(result => {
        toolsMap[result.id] = result.tools;
      });
      
      return toolsMap;
    } catch (error) {
      console.error('获取所有可用MCP工具失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定MCP客户端的所有可用资源
   * @returns 按客户端ID分组的资源映射
   */
  async getAllAvailableResources(): Promise<Record<string, ResourceInfo[]>> {
    try {
      console.log('获取所有可用MCP资源');
      
      // 获取所有已启用的MCP配置
      const configs = await this.mcpService.getAllConfigs();
      const enabledConfigs = configs.filter(config => config.enabled);
      
      // 并行获取所有配置的资源列表
      const resourcesPromises = enabledConfigs.map(async (config) => {
        try {
          const resources = await this.listResources(config.id);
          return { id: config.id, resources };
        } catch (error) {
          console.error(`获取配置 ${config.id} 的资源列表失败:`, error);
          return { id: config.id, resources: [] };
        }
      });
      
      const results = await Promise.all(resourcesPromises);
      
      // 构建结果映射
      const resourcesMap: Record<string, ResourceInfo[]> = {};
      results.forEach(result => {
        resourcesMap[result.id] = result.resources;
      });
      
      return resourcesMap;
    } catch (error) {
      console.error('获取所有可用MCP资源失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定MCP客户端的所有可用提示
   * @returns 按客户端ID分组的提示映射
   */
  async getAllAvailablePrompts(): Promise<Record<string, PromptInfo[]>> {
    try {
      console.log('获取所有可用MCP提示');
      
      // 获取所有已启用的MCP配置
      const configs = await this.mcpService.getAllConfigs();
      const enabledConfigs = configs.filter(config => config.enabled);
      
      // 并行获取所有配置的提示列表
      const promptsPromises = enabledConfigs.map(async (config) => {
        try {
          const prompts = await this.listPrompts(config.id);
          return { id: config.id, prompts };
        } catch (error) {
          console.error(`获取配置 ${config.id} 的提示列表失败:`, error);
          return { id: config.id, prompts: [] };
        }
      });
      
      const results = await Promise.all(promptsPromises);
      
      // 构建结果映射
      const promptsMap: Record<string, PromptInfo[]> = {};
      results.forEach(result => {
        promptsMap[result.id] = result.prompts;
      });
      
      return promptsMap;
    } catch (error) {
      console.error('获取所有可用MCP提示失败:', error);
      throw error;
    }
  }

  /**
   * 刷新指定MCP客户端的工具列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的工具列表
   */
  async refreshTools(configId: string): Promise<ToolInfo[]> {
    try {
      console.log(`刷新MCP工具列表, 配置ID: ${configId}`);
      
      // 删除缓存
      delete this.toolsCache[configId];
      
      // 重新获取工具列表
      return this.listTools(configId);
    } catch (error) {
      console.error(`刷新MCP工具列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 刷新指定MCP客户端的资源列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的资源列表
   */
  async refreshResources(configId: string): Promise<ResourceInfo[]> {
    try {
      console.log(`刷新MCP资源列表, 配置ID: ${configId}`);
      
      // 删除缓存
      delete this.resourcesCache[configId];
      
      // 重新获取资源列表
      return this.listResources(configId);
    } catch (error) {
      console.error(`刷新MCP资源列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 刷新指定MCP客户端的提示列表
   * @param configId MCP客户端配置ID
   * @returns 更新后的提示列表
   */
  async refreshPrompts(configId: string): Promise<PromptInfo[]> {
    try {
      console.log(`刷新MCP提示列表, 配置ID: ${configId}`);
      
      // 删除缓存
      delete this.promptsCache[configId];
      
      // 重新获取提示列表
      return this.listPrompts(configId);
    } catch (error) {
      console.error(`刷新MCP提示列表失败(ID: ${configId}):`, error);
      throw error;
    }
  }

  /**
   * 确保MCP客户端已连接
   * @param configId MCP客户端配置ID
   * @private
   */
  private async ensureClientConnected(configId: string): Promise<void> {
    try {
      // 获取客户端状态
      const status = await this.mcpService.getServerStatus(configId);
      
      // 检查客户端是否已连接
      if (status.status !== ClientStatus.Connected) {
        console.log(`MCP客户端未连接, 尝试连接, 配置ID: ${configId}`);
        
        // 尝试连接客户端
        const newStatus = await this.mcpService.getServerStatus(configId);
        
        // 再次检查连接状态
        if (newStatus.status !== ClientStatus.Connected) {
          throw new Error(`无法连接到MCP客户端(ID: ${configId}): ${newStatus.error || '未知错误'}`);
        }
      }
    } catch (error: any) {
      // 检查是否是"Transport error: Channel closed"错误
      const errorMessage = error?.toString() || '';
      if (errorMessage.includes('Transport error: Channel closed')) {
        console.error(`MCP客户端连接通道已关闭(ID: ${configId})`);
        
        // 直接抛出错误，让调用者知道需要重新初始化客户端
        // 这里不再尝试重新获取状态，因为getServerStatus方法已经处理了重新初始化的逻辑
        throw new Error(`MCP客户端连接通道已关闭(ID: ${configId})，需要重新初始化客户端`);
      }
      
      // 其他错误直接抛出
      console.error(`确保MCP客户端连接失败(ID: ${configId}):`, error);
      throw error;
    }
  }
} 