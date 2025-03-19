import { IService } from '../interfaces';
import { IMcpServerConfigRepository } from '../../repositories/interfaces';
import { McpServerConfig, TransportType, ClientStatus, ClientStatusResponse, McpResponse } from '../../models/mcpTypes';
import { IMcpService } from '../interfaces';
import { invoke } from '@tauri-apps/api/core';

export class McpConfigService implements IMcpService {
  // 存储服务器状态的缓存
  private statusCache: Record<string, ClientStatusResponse> = {};
  
  constructor(private repository: IMcpServerConfigRepository) {}

  async initialize(): Promise<void> {
    try {
      console.log('开始初始化MCP服务...');
      
      // 获取所有已启用的配置
      const configs = await this.repository.findAll();
      const enabledConfigs = configs.filter(config => config.enabled);
      
      if (enabledConfigs.length > 0) {
        console.log(`找到 ${enabledConfigs.length} 个已启用的MCP服务配置，开始自动连接...`);
        
        // 并行连接所有已启用的服务
        const connectionPromises = enabledConfigs.map(async (config) => {
          try {
            console.log(`正在连接MCP服务: ${config.name} (ID: ${config.id})`);
            const status = await this.getServerStatus(config.id);
            
            // 更新缓存
            this.statusCache[config.id] = status;
            
            console.log(`MCP服务连接${status.status === ClientStatus.Connected ? '成功' : '失败'}: ${config.name} (ID: ${config.id})`);
            return { id: config.id, status };
          } catch (error) {
            console.error(`连接MCP服务失败: ${config.name} (ID: ${config.id})`, error);
            
            // 即使失败也更新缓存
            const errorStatus: ClientStatusResponse = {
              id: config.id,
              status: ClientStatus.Error,
              connected_at: new Date().toISOString(),
              error: error instanceof Error ? error.message : '连接失败'
            };
            
            this.statusCache[config.id] = errorStatus;
            return { id: config.id, status: errorStatus };
          }
        });
        
        // 等待所有连接完成
        await Promise.allSettled(connectionPromises);
        console.log('所有已启用的MCP服务连接尝试完成');
      } else {
        console.log('没有找到已启用的MCP服务配置');
      }
      
      console.log('MCP服务初始化完成');
    } catch (error) {
      console.error('MCP服务初始化失败:', error);
      // 初始化失败不应阻止应用程序启动，所以这里不抛出错误
    }
  }

  async dispose(): Promise<void> {
    // 清理逻辑
    console.log('MCP服务资源释放完成');
  }

  // 实现 IMcpService 接口的方法
  async getAllConfigs(): Promise<McpServerConfig[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('获取所有MCP配置失败:', error);
      throw error;
    }
  }

  async getConfig(id: string): Promise<McpServerConfig | null> {
    try {
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`获取MCP配置(ID: ${id})失败:`, error);
      throw error;
    }
  }

  async createConfig(config: Omit<McpServerConfig, 'id'>): Promise<McpServerConfig> {
    try {
      // 验证配置
      await this.validateConfig(config as McpServerConfig);
      
      // 创建配置
      const createdConfig = await this.repository.create(config);
      console.log('MCP配置创建成功:', createdConfig);
      return createdConfig;
    } catch (error) {
      console.error('创建MCP配置失败:', error);
      throw error;
    }
  }

  async updateConfig(id: string, config: Partial<McpServerConfig>): Promise<McpServerConfig> {
    try {
      // 获取现有配置
      const existingConfig = await this.repository.findById(id);
      if (!existingConfig) {
        throw new Error(`MCP配置(ID: ${id})不存在`);
      }
      
      // 合并配置
      const mergedConfig = { ...existingConfig, ...config };
      
      // 验证合并后的配置
      await this.validateConfig(mergedConfig);
      
      // 更新配置，添加重试逻辑
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: any = null;
      
      while (retryCount < maxRetries) {
        try {
          // 更新配置
          const updatedConfig = await this.repository.update(id, config);
          console.log('MCP配置更新成功:', updatedConfig);
          return updatedConfig;
        } catch (error) {
          lastError = error;
          retryCount++;
          console.warn(`更新MCP配置失败，尝试重试 (${retryCount}/${maxRetries}):`, error);
          
          // 如果是事务错误，等待一小段时间后重试
          if (error instanceof Error && error.message.includes('transaction')) {
            await new Promise(resolve => setTimeout(resolve, 100 * retryCount));
          } else {
            // 如果不是事务错误，直接抛出
            throw error;
          }
        }
      }
      
      // 如果重试次数用完仍然失败，抛出最后一个错误
      throw lastError;
    } catch (error) {
      console.error(`更新MCP配置(ID: ${id})失败:`, error);
      throw error;
    }
  }

  async deleteConfig(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
      console.log(`MCP配置(ID: ${id})删除成功`);
    } catch (error) {
      console.error(`删除MCP配置(ID: ${id})失败:`, error);
      throw error;
    }
  }

  async getConfigByName(name: string): Promise<McpServerConfig | null> {
    try {
      return await this.repository.findByName(name);
    } catch (error) {
      console.error(`通过名称获取MCP配置(${name})失败:`, error);
      throw error;
    }
  }

  async getConfigByTransportType(type: TransportType): Promise<McpServerConfig[]> {
    try {
      return await this.repository.findByTransportType(type);
    } catch (error) {
      console.error(`通过传输类型获取MCP配置(${type})失败:`, error);
      throw error;
    }
  }

  async listRecentConfigs(limit: number): Promise<McpServerConfig[]> {
    try {
      return await this.repository.listRecent(limit);
    } catch (error) {
      console.error(`获取最近${limit}个MCP配置失败:`, error);
      throw error;
    }
  }

  // 业务方法
  async validateConfig(config: McpServerConfig): Promise<void> {
    // 基本验证
    if (!config.name?.trim()) {
      throw new Error('配置名称不能为空');
    }
    
    if (!config.timeoutSecs || config.timeoutSecs <= 0) {
      throw new Error('超时时间必须大于0');
    }
    
    // 根据传输类型验证
    if (config.transportType === TransportType.SSE && !config.sseUrl?.trim()) {
      throw new Error('SSE传输类型必须提供SSE URL');
    }
    
    if (config.transportType === TransportType.Stdio && !config.command?.trim()) {
      throw new Error('Stdio传输类型必须提供命令');
    }
    
    // 验证客户端信息
    if (!config.clientName?.trim()) {
      throw new Error('客户端名称不能为空');
    }
    
    if (!config.clientVersion?.trim()) {
      throw new Error('客户端版本不能为空');
    }
  }

  // 克隆配置
  async cloneConfig(id: string, newName: string): Promise<McpServerConfig> {
    try {
    const original = await this.repository.findById(id);
      if (!original) {
        throw new Error(`MCP配置(ID: ${id})不存在`);
      }
    
    const { id: _, ...configWithoutId } = original;
    
    return this.repository.create({
      ...configWithoutId,
      name: newName
    });
    } catch (error) {
      console.error(`克隆MCP配置(ID: ${id})失败:`, error);
      throw error;
    }
  }

  // 导入/导出功能
  async exportConfigs(): Promise<string> {
    try {
    const configs = await this.repository.findAll();
    return JSON.stringify(configs, null, 2);
    } catch (error) {
      console.error('导出MCP配置失败:', error);
      throw error;
    }
  }

  async importConfigs(json: string): Promise<void> {
    try {
    const configs: McpServerConfig[] = JSON.parse(json);
    for (const config of configs) {
        const { id, ...configWithoutId } = config;
        await this.createConfig(configWithoutId);
      }
      console.log(`成功导入${configs.length}个MCP配置`);
    } catch (error) {
      console.error('导入MCP配置失败:', error);
      throw error;
    }
  }

  // 获取服务器状态
  async getServerStatus(configId: string): Promise<ClientStatusResponse> {
    try {
      // 获取配置
      const config = await this.repository.findById(configId);
      if (!config) {
        throw new Error(`MCP配置(ID: ${configId})不存在`);
      }

      // 先尝试获取现有客户端状态
      try {
        const status = await invoke('get_mcp_client_status', { clientId: configId });
        console.log('获取现有客户端状态:', status);
        
        // 如果客户端存在且状态正常，验证连接是否真的有效
        if (status && (status as ClientStatusResponse).status === ClientStatus.Connected) {
          // 通过执行list_tools和list_resources来验证连接是否真的有效
          try {
            console.log('验证连接是否真的有效，尝试执行list_tools...');
            const response = await invoke<McpResponse<any>>('list_mcp_tools', { 
              request: { client_id: configId, filter: '' } 
            });

            if (response.success) {
              console.log('list_tools执行成功，连接有效');
              this.statusCache[configId] = status as ClientStatusResponse;
              return status as ClientStatusResponse;
            }else{
              try{
                await invoke('delete_mcp_client', { clientId: configId });
                console.log('已删除可能存在的客户端');
              } catch (deleteError) {
                console.warn('删除客户端失败或客户端不存在:', deleteError);
                // 继续执行，即使删除失败
              } 
              console.error('list_tools执行失败:', response.error);
            }

          
          } catch (toolsError: any) {
            console.error('list_tools执行失败:', toolsError);
            
            // 检查是否是"Transport error: Channel closed"错误
            const errorMessage = toolsError?.toString() || '';
            if (errorMessage.includes('Transport error: Channel closed')) {
              console.warn('检测到Transport error: Channel closed错误，客户端实际未连接');
              
              // 尝试再次验证，使用list_resources
              try {
                console.log('尝试执行list_resources进行二次验证...');
                await invoke('list_mcp_resources', { 
                  request: { client_id: configId, filter: '' } 
                });
                
                console.log('list_resources执行成功，连接有效');
                this.statusCache[configId] = status as ClientStatusResponse;
                return status as ClientStatusResponse;
              } catch (resourcesError: any) {
                console.error('list_resources执行失败:', resourcesError);
                
                // 如果两个操作都失败且都是Channel closed错误，则认为客户端未连接
                const resourcesErrorMessage = resourcesError?.toString() || '';
                if (resourcesErrorMessage.includes('Transport error: Channel closed')) {
                  console.error('确认客户端实际未连接，需要重新初始化客户端');
                  
                  // 直接调用Rust端的initialize_mcp_client来重新初始化客户端
                  console.log('直接调用initialize_mcp_client重新初始化客户端...');
                  
                  
                }
              }
            }
            
            // 如果不是Channel closed错误或只有一个操作失败，仍然认为连接有效
            this.statusCache[configId] = status as ClientStatusResponse;
            return status as ClientStatusResponse;
          }
        }
        
        // 如果客户端存在但状态异常，尝试修复连接
        if (status) {
          console.log('客户端存在但状态异常，尝试修复连接');
          try {
            // 尝试修复连接而不是重建
            const repairResult = await invoke('mcp_repair_client', { clientId: configId });
            console.log('修复连接结果:', repairResult);
            
            // 重新获取状态
            const updatedStatus = await invoke('get_mcp_client_status', { clientId: configId });
            this.statusCache[configId] = updatedStatus as ClientStatusResponse;
            return updatedStatus as ClientStatusResponse;
          } catch (repairError: any) {
            console.error('修复连接失败:', repairError);
            
            // 检查是否是"Transport error: Channel closed"错误
            const errorMessage = repairError?.toString() || '';
            if (errorMessage.includes('Transport error: Channel closed')) {
              console.error('修复过程中检测到Transport error: Channel closed错误，需要重新初始化客户端');
              
              // 直接调用Rust端的initialize_mcp_client来重新初始化客户端
              // 先尝试删除现有客户端
              try {
                await invoke('delete_mcp_client', { clientId: configId });
                console.log('已删除现有客户端');
              } catch (deleteError) {
                console.warn('删除客户端失败或客户端不存在:', deleteError);
                // 继续执行，即使删除失败
              }
              
              // 准备初始化请求
              const request = {
                id: config.id,
                transport_type: config.transportType.toLowerCase(),
                sse_url: config.transportType === TransportType.SSE ? config.sseUrl : undefined,
                command: config.transportType === TransportType.Stdio ? config.command : undefined,
                args: config.transportType === TransportType.Stdio ? config.args || [] : undefined,
                headers: config.transportType === TransportType.SSE ? config.sseHeaders || {} : 
                         config.transportType === TransportType.Stdio ? config.envVars || {} : {},
                client_name: config.clientName,
                client_version: config.clientVersion,
                timeout_secs: config.timeoutSecs
              };
              
              console.log('初始化请求:', request);
              
              // 调用Rust端的initialize_mcp_client
              try {
                const newStatus = await invoke('initialize_mcp_client', { request });
                console.log('客户端重新初始化结果:', newStatus);
                
                // 更新缓存
                this.statusCache[configId] = newStatus as ClientStatusResponse;
                return newStatus as ClientStatusResponse;
              } catch (initError) {
                console.error('客户端重新初始化失败:', initError);
                
                // 返回错误状态
                const errorStatus: ClientStatusResponse = {
                  id: configId,
                  status: ClientStatus.Error,
                  connected_at: new Date().toISOString(),
                  error: initError instanceof Error ? initError.message : '客户端重新初始化失败'
                };
                
                this.statusCache[configId] = errorStatus;
                return errorStatus;
              }
            }
            
            // 如果不是Channel closed错误，继续执行初始化逻辑
            console.error('修复连接失败，将尝试重建连接:', repairError);
          }
        }
      } catch (error: any) {
        // 检查是否是"Transport error: Channel closed"错误
        const errorMessage = error?.toString() || '';
        if (errorMessage.includes('Transport error: Channel closed')) {
          console.error('获取状态过程中检测到Transport error: Channel closed错误，需要重新初始化客户端');
          
          // 直接调用Rust端的initialize_mcp_client来重新初始化客户端
          // 先尝试删除现有客户端
          try {
            await invoke('delete_mcp_client', { clientId: configId });
            console.log('已删除现有客户端');
          } catch (deleteError) {
            console.warn('删除客户端失败或客户端不存在:', deleteError);
            // 继续执行，即使删除失败
          }
          
          // 准备初始化请求
          const request = {
            id: config.id,
            transport_type: config.transportType.toLowerCase(),
            sse_url: config.transportType === TransportType.SSE ? config.sseUrl : undefined,
            command: config.transportType === TransportType.Stdio ? config.command : undefined,
            args: config.transportType === TransportType.Stdio ? config.args || [] : undefined,
            headers: config.transportType === TransportType.SSE ? config.sseHeaders || {} : 
                     config.transportType === TransportType.Stdio ? config.envVars || {} : {},
            client_name: config.clientName,
            client_version: config.clientVersion,
            timeout_secs: config.timeoutSecs
          };
          
          console.log('初始化请求:', request);
          
          // 调用Rust端的initialize_mcp_client
          try {
            const newStatus = await invoke('initialize_mcp_client', { request });
            console.log('客户端重新初始化结果:', newStatus);
            
            // 更新缓存
            this.statusCache[configId] = newStatus as ClientStatusResponse;
            return newStatus as ClientStatusResponse;
          } catch (initError) {
            console.error('客户端重新初始化失败:', initError);
            
            // 返回错误状态
            const errorStatus: ClientStatusResponse = {
              id: configId,
              status: ClientStatus.Error,
              connected_at: new Date().toISOString(),
              error: initError instanceof Error ? initError.message : '客户端重新初始化失败'
            };
            
            this.statusCache[configId] = errorStatus;
            return errorStatus;
          }
        }
        
        console.log('客户端不存在，将创建新连接:', error);
        // 继续执行初始化逻辑
      }

      // 如果客户端不存在或无法修复，创建新连接
      console.log('创建新连接');
      let status: ClientStatusResponse;
      if (config.transportType === TransportType.SSE) {
        status = await this.createSseConnection(config);
      } else {
        status = await this.createStdioConnection(config);
      }

      // 更新缓存
      this.statusCache[configId] = status;
      return status;
    } catch (error) {
      console.error(`获取MCP服务器状态失败(ID: ${configId}):`, error);
      
      // 返回错误状态
      const errorStatus: ClientStatusResponse = {
        id: configId,
        status: ClientStatus.Error,
        connected_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : '未知错误'
      };
      
      // 更新缓存
      this.statusCache[configId] = errorStatus;
      return errorStatus;
    }
  }

  // 测试SSE连接
  private async createSseConnection(config: McpServerConfig): Promise<ClientStatusResponse> {
    try {
      console.log(`创建SSE连接: ${config.sseUrl}`);
      
      // 初始化客户端请求
      const request = {
        id: config.id,
        transport_type: config.transportType.toLowerCase(),
        sse_url: config.sseUrl,
        headers: config.sseHeaders || {},
        client_name: config.clientName,
        client_version: config.clientVersion,
        timeout_secs: config.timeoutSecs
      };
      
      // 先尝试删除可能存在的客户端
      try {
        await invoke('delete_mcp_client', { clientId: config.id });
        console.log('已删除可能存在的客户端');
      } catch (error) {
        // 忽略删除错误，客户端可能本来就不存在
        console.log('删除客户端失败或客户端不存在:', error);
      }
      
      // 然后初始化新客户端
      console.log('调用 Rust 后端初始化 SSE 客户端:', request);
      const status = await invoke('initialize_mcp_client', { request });
      console.log('Rust 后端返回 SSE 状态:', status);
      return status as ClientStatusResponse;
    } catch (error) {
      console.error(`SSE连接测试失败: ${config.sseUrl}`, error);
      return {
        id: config.id,
        status: ClientStatus.Error,
        connected_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 测试Stdio连接
  private async createStdioConnection(config: McpServerConfig): Promise<ClientStatusResponse> {
    try {
      console.log(`创建Stdio连接: ${config.command}`);
      
      // 初始化客户端请求
      const request = {
        id: config.id,
        transport_type: config.transportType.toLowerCase(),
        command: config.command,
        args: config.args || [],
        headers: config.envVars || {},
        client_name: config.clientName,
        client_version: config.clientVersion,
        timeout_secs: config.timeoutSecs
      };
      
      // 先尝试删除可能存在的客户端
      try {
        await invoke('delete_mcp_client', { clientId: config.id });
        console.log('已删除可能存在的客户端');
      } catch (error) {
        // 忽略删除错误，客户端可能本来就不存在
        console.log('删除客户端失败或客户端不存在:', error);
      }
      
      console.log('调用 Rust 后端初始化客户端:', request);
      
      try {
        // 调用 Rust 后端的 initialize_mcp_client 命令
        const status = await invoke('initialize_mcp_client', { request });
        console.log('Rust 后端返回状态:', status);
        return status as ClientStatusResponse;
      } catch (error) {
        console.error('调用 Rust 后端命令失败:', error);
        return {
          id: config.id,
          status: ClientStatus.Error,
          connected_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : '调用后端命令失败'
        };
      }
    } catch (error) {
      console.error(`Stdio连接测试失败: ${config.command}`, error);
      return {
        id: config.id,
        status: ClientStatus.Error,
        connected_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 获取所有服务器状态
  async getAllServerStatuses(): Promise<Record<string, ClientStatusResponse>> {
    try {
      console.log('开始获取所有MCP服务器状态');
      const configs = await this.repository.findAll();
      const statuses: Record<string, ClientStatusResponse> = {};
      
      // 先尝试使用Tauri命令获取所有状态
      try {
        console.log('尝试使用Tauri命令获取所有客户端状态');
        const allStatuses = await invoke('get_all_mcp_client_statuses');
        console.log('获取所有客户端状态结果:', allStatuses);
        
        if (allStatuses && Array.isArray(allStatuses)) {
          // 将数组转换为对象
          (allStatuses as ClientStatusResponse[]).forEach(status => {
            statuses[status.id] = status;
          });
          
          // 检查是否所有配置都有对应的状态
          const missingConfigs = configs.filter(config => !statuses[config.id]);
          
          // 如果有配置没有对应的状态，单独获取这些配置的状态
          if (missingConfigs.length > 0) {
            console.log(`有${missingConfigs.length}个配置没有状态，将单独获取`);
            await Promise.all(
              missingConfigs.map(async (config) => {
                try {
                  statuses[config.id] = await this.getServerStatus(config.id);
                } catch (error) {
                  console.error(`获取服务器状态失败(ID: ${config.id}):`, error);
                  statuses[config.id] = {
                    id: config.id,
                    status: ClientStatus.Error,
                    connected_at: new Date().toISOString(),
                    error: error instanceof Error ? error.message : '未知错误'
                  };
                }
              })
            );
          }
          
          return statuses;
        }
      } catch (error) {
        console.error('使用Tauri命令获取所有客户端状态失败:', error);
        // 继续使用单独获取的方式
      }
      
      // 如果Tauri命令失败，则单独获取每个配置的状态
      console.log('使用单独获取的方式获取所有服务器状态');
      await Promise.all(
        configs.map(async (config) => {
          try {
            statuses[config.id] = await this.getServerStatus(config.id);
          } catch (error) {
            console.error(`获取服务器状态失败(ID: ${config.id}):`, error);
            statuses[config.id] = {
              id: config.id,
              status: ClientStatus.Error,
              connected_at: new Date().toISOString(),
              error: error instanceof Error ? error.message : '未知错误'
            };
          }
        })
      );
      
      console.log('获取所有服务器状态完成:', statuses);
      return statuses;
    } catch (error) {
      console.error('获取所有MCP服务器状态失败:', error);
      throw error;
    }
  }
}
