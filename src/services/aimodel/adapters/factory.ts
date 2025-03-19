  // src/services/aimodel/adapters/factory.ts
  import { ModelProviderAdapter } from './interfaces';
  import { OpenAIAdapter } from './OpenAIAdapter';
  import { OllamaAdapter } from './OllamaAdapter';
  import { SiliconAdapter } from './SiliconAdapter';
  import { DeepseekAdapter } from './DeepseekAdapter';
  
  export function createAdapter(providerId: string, providerName?: string, config?: any): ModelProviderAdapter | null {
    // 首先检查配置中是否指定了适配器类型
    if (config && config.adapterType) {
      const adapterType = config.adapterType.toLowerCase();
      if (adapterType === 'openai') return new OpenAIAdapter();
      if (adapterType === 'ollama') return new OllamaAdapter();
      if (adapterType === 'silicon') return new SiliconAdapter();
      if (adapterType === 'deepseek') return new DeepseekAdapter();
    }
    
    // 如果是UUID格式，尝试通过名称识别
    if (providerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && providerName) {
      const name = providerName.toLowerCase();
      if (name.includes('openai')) return new OpenAIAdapter();
      if (name.includes('ollama')) return new OllamaAdapter();
      if (name.includes('silicon')) return new SiliconAdapter();
      if (name.includes('deepseek')) return new DeepseekAdapter();
    }
    
    // 常规ID处理
    const id = providerId.toLowerCase();
    if (id === 'openai') return new OpenAIAdapter();
    if (id === 'ollama') return new OllamaAdapter();
    if (id === 'silicon') return new SiliconAdapter();
    if (id === 'deepseek') return new DeepseekAdapter();
    
    console.error(`No adapter available for provider: ${providerId}`);
    return null;
  }