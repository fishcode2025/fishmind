import { Model } from './models/types';
import { getModelIcon, getModelIconById, getGroupIcon } from '../../config/models';
import { getProviderLogo } from '../../config/providers';
import { ModelServiceManager } from './ModelServiceManager';

export * from './models/types';
export * from './ModelServiceManager';
export * from './adapters/index';

export class ModelService {
  // 现有的方法...

  /**
   * 获取模型图标
   * @param model 模型对象
   * @param isDarkMode 是否为深色模式
   * @returns 图标路径
   */
  getModelIcon(model: Model, isDarkMode: boolean = false): string {
    return getModelIcon(model, isDarkMode);
  }

  /**
   * 根据模型ID获取图标
   * @param modelId 模型ID
   * @param isDarkMode 是否为深色模式
   * @returns 图标路径
   */
  getModelIconById(modelId: string, isDarkMode: boolean = false): string {
    return getModelIconById(modelId, isDarkMode);
  }

  /**
   * 获取提供商图标
   * @param provider 提供商ID
   * @param isDarkMode 是否为深色模式
   * @returns 图标路径
   */
  getProviderIcon(provider: string, isDarkMode: boolean = false): string {
    return getProviderLogo(provider) || '';
  }

  /**
   * 获取模型组图标
   * @param groupId 模型组ID
   * @param isDarkMode 是否为深色模式
   * @returns 图标路径
   */
  getGroupIcon(groupId: string, isDarkMode: boolean = false): string {
    return getGroupIcon(groupId, isDarkMode);
  }
}

// 创建一个单例实例
const modelService = new ModelServiceManager();
const modelIconService = new ModelService();

// 初始化服务提供商
modelService.initializeProviders().catch(error => {
  console.error('Failed to initialize model service providers', error);
});

export { modelIconService };
export default modelService;
