/**
 * 服务容器
 * 负责管理所有服务实例和依赖注入
 */
import { IService, IAiModelService, IChatService, IConfigService, IMcpService, IMcpToolService } from './interfaces';
import { SERVICE_KEYS } from './constants';

/**
 * 服务容器类
 * 使用单例模式实现
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private initialized: boolean = false;
  
  private serviceMap = {
    [SERVICE_KEYS.AI_MODEL]: null as IAiModelService | null,
    [SERVICE_KEYS.CHAT]: null as IChatService | null,
    [SERVICE_KEYS.CONFIG]: null as IConfigService | null,
    [SERVICE_KEYS.MCP]: null as IMcpService | null,
    [SERVICE_KEYS.MCP_TOOL]: null as IMcpToolService | null,
  };
  
  /**
   * 私有构造函数，防止直接实例化
   */
  private constructor() {}
  
  /**
   * 获取服务容器实例
   * @returns 服务容器实例
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }
  
  /**
   * 注册服务
   * @param key 服务键名
   * @param service 服务实例
   */
  public register<T>(key: string, service: T): void {
    if (this.initialized) {
      console.warn('服务容器已初始化，注册新服务可能导致问题');
    }
    
    if (this.services.has(key)) {
      console.warn(`服务 ${key} 已存在，将被覆盖`);
    }
    
    this.services.set(key, service);
  }
  
  /**
   * 获取服务
   * @param key 服务键名
   * @returns 服务实例
   * @throws 如果服务不存在则抛出错误
   */
  public get<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`服务 ${key} 不存在`);
    }
    return service as T;
  }
  
  /**
   * 检查服务是否存在
   * @param key 服务键名
   * @returns 服务是否存在
   */
  public has(key: string): boolean {
    return this.services.has(key);
  }
  
  /**
   * 初始化所有服务
   * 按照注册顺序初始化
   */
  public async initialize(serviceKey?: string): Promise<void> {
    if (serviceKey) {
      // 初始化单个服务
      const service = this.services.get(serviceKey);
      if (!service) {
        throw new Error(`服务 ${serviceKey} 不存在`);
      }
      
      if (typeof service.initialize === 'function') {
        try {
          console.log(`初始化服务: ${serviceKey}`);
          await service.initialize();
          console.log(`服务 ${serviceKey} 初始化成功`);
        } catch (error) {
          console.error(`服务 ${serviceKey} 初始化失败:`, error);
          throw error;
        }
      }
    } else {
      if (this.initialized) {
        console.warn('服务容器已经初始化');
        return;
      }
      
      console.log('开始初始化服务容器...');
      
      // 按照注册顺序初始化服务
      for (const [key, service] of this.services.entries()) {
        if (typeof service.initialize === 'function') {
          try {
            console.log(`初始化服务: ${key}`);
            await service.initialize();
            console.log(`服务 ${key} 初始化成功`);
          } catch (error) {
            console.error(`服务 ${key} 初始化失败:`, error);
            throw new Error(`服务 ${key} 初始化失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          console.warn(`服务 ${key} 没有实现 initialize 方法`);
        }
      }
      
      this.initialized = true;
      console.log('服务容器初始化完成');
    }
  }
  
  /**
   * 释放所有服务资源
   * 按照注册顺序的逆序释放
   */
  public async dispose(): Promise<void> {
    if (!this.initialized) {
      console.warn('服务容器尚未初始化');
      return;
    }
    
    console.log('开始释放服务资源...');
    
    // 按照注册顺序的逆序释放服务资源
    const serviceEntries = Array.from(this.services.entries());
    for (let i = serviceEntries.length - 1; i >= 0; i--) {
      const [key, service] = serviceEntries[i];
      if (typeof service.dispose === 'function') {
        try {
          console.log(`释放服务: ${key}`);
          await service.dispose();
          console.log(`服务 ${key} 释放成功`);
        } catch (error) {
          console.error(`服务 ${key} 释放失败:`, error);
          // 继续释放其他服务，不抛出异常
        }
      } else {
        console.warn(`服务 ${key} 没有实现 dispose 方法`);
      }
    }
    
    this.initialized = false;
    console.log('服务容器资源释放完成');
  }
  
  /**
   * 重置服务容器
   * 仅用于测试目的
   */
  public static reset(): void {
    if (ServiceContainer.instance) {
      ServiceContainer.instance.services.clear();
      ServiceContainer.instance.initialized = false;
    }
  }

  public isInitialized(): boolean {
    return this.initialized && Array.from(this.services.values()).every(
      service => !service.initialize || service.isInitialized
    );
  }

  public getInitializationStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};
    this.services.forEach((service, key) => {
      status[key] = !service.initialize || service.isInitialized;
    });
    return status;
  }

  public getAiModelService(): IAiModelService {
    return this.get<IAiModelService>(SERVICE_KEYS.AI_MODEL);
  }

  public getChatService(): IChatService {
    return this.get<IChatService>(SERVICE_KEYS.CHAT);
  }

  public getMcpService(): IMcpService {
    return this.get<IMcpService>(SERVICE_KEYS.MCP);
  }

  public getMcpToolService(): IMcpToolService {
    return this.get<IMcpToolService>(SERVICE_KEYS.MCP_TOOL);
  }
} 