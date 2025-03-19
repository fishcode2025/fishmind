import { IModelAdapter } from './IModelAdapter';
import { IMcpTool } from '../mcpToolHandler';
import { OpenAIAdapter } from './OpenAIAdapter';

/**
 * LMStudio 模型适配器
 * 基于 LMStudioChatService 的实现，LMStudio 使用与 OpenAI 完全兼容的 API 格式
 * 因此直接继承 OpenAIAdapter
 */
export class LMStudioAdapter extends OpenAIAdapter implements IModelAdapter {
  constructor() {
    super();
  }
  
  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return 'lmstudio';
  }
} 