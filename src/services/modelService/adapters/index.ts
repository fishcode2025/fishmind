import { ModelProviderAdapter } from '../models/types';
import { OpenAIAdapter } from './OpenAIAdapter';
import { OllamaAdapter } from './OllamaAdapter';
import { SiliconAdapter } from './SiliconAdapter';
import { DeepseekAdapter } from './DeepseekAdapter';

/**
 * 适配器工厂，根据提供商ID创建相应的适配器
 */
export function createAdapter(providerId: string): ModelProviderAdapter | null {
  switch (providerId.toLowerCase()) {
    case 'openai':
      return new OpenAIAdapter();
    case 'silicon':
      return new SiliconAdapter();
    case 'ollama':
      return new OllamaAdapter();
    case 'deepseek':
      return new DeepseekAdapter();
    default:
      console.error(`No adapter available for provider: ${providerId}`);
      return null;
  }
}
