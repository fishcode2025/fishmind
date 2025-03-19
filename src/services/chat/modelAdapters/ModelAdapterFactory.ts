import { IModelAdapter } from './IModelAdapter';
import { OpenAIAdapter } from './OpenAIAdapter';
import { AnthropicAdapter } from './AnthropicAdapter';
import { GoogleAdapter } from './GoogleAdapter';
import { OllamaAdapter } from './OllamaAdapter';
import { LMStudioAdapter } from './LMStudioAdapter';

/**
 * 模型适配器工厂
 * 根据提供商名称创建对应的适配器
 */
export class ModelAdapterFactory {
  /**
   * 创建适配器
   * @param providerName 提供商名称
   * @returns 适配器实例
   */
  static createAdapter(providerName: string): IModelAdapter {
    const provider = providerName.toLowerCase();
    
    switch (provider) {
      case 'openai':
        return new OpenAIAdapter();
      case 'anthropic':
        return new AnthropicAdapter();
      case 'google':
        return new GoogleAdapter();
      case 'ollama':
        return new OllamaAdapter();
      case 'lmstudio':
        return new LMStudioAdapter();
      default:
        console.warn(`未知的提供商 ${providerName}，使用 OpenAI 适配器作为默认值`);
        return new OpenAIAdapter();
    }
  }
} 