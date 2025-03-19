import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { directoryService } from './DirectoryService';
import { BaseDirectory } from '@tauri-apps/plugin-fs';
import { ModelServiceProvider, Model } from '../modelService/models/types';

/**
 * 系统配置接口
 */
export interface SystemConfig {
  paths: {
    data: string;      // 数据根目录
    chats: string;     // 聊天数据目录
    database: string;  // 数据库文件路径
    logs: string;      // 日志目录
  };
  database: {
    filename: string;  // 数据库文件名
    maxSize: number;   // 数据库大小限制（MB）
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFiles: number;  // 最大日志文件数
  };
  providers: Record<string, ProviderConfig>;
}

/**
 * 用户配置接口
 */
export interface UserSettings {
  models: {
    defaultModels: {
      assistant: {
        providerId: string;
        modelId: string;
        name: string;
      };
      topicNaming: {
        providerId: string;
        modelId: string;
        name: string;
      };
      translation: {
        providerId: string;
        modelId: string;
        name: string;
      };
    };
    providers: Array<Omit<ModelServiceProvider, 'name' | 'icon' | 'config'>>;
  };
  ui: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    language: string;
  };
  mcp: {
    servers: Record<string, {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      autoApprove?: string[];
      disabled?: boolean;
      timeout?: number;
    }>;
  };
}

/**
 * 供应商配置接口
 */
export interface ProviderConfig {
  enabled: boolean;
  name: string;
  icon: string;
  api: {
    url: string;
  };
  websites: {
    official: string;
    apiKey?: string;
    docs?: string;
    models?: string;
  };
}

/**
 * 默认系统配置
 */
const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  paths: {
    data: 'data',
    chats: 'data/chats',
    database: 'data/db',
    logs: 'logs'
  },
  database: {
    filename: 'chat_history.db',
    maxSize: 100
  },
  logging: {
    level: 'info',
    maxFiles: 5
  },
  providers: {
    openai: {
      enabled: true,
      name: "OpenAI",
      icon: "openai",
      api: {
        url: "https://api.openai.com"
      },
      websites: {
        official: "https://openai.com/",
        apiKey: "https://platform.openai.com/api-keys",
        docs: "https://platform.openai.com/docs",
        models: "https://platform.openai.com/docs/models"
      }
    },
    silicon: {
      enabled: true,
      name: "硅基流动",
      icon: "silicon",
      api: {
        url: "https://api.siliconflow.cn"
      },
      websites: {
        official: "https://www.siliconflow.cn/",
        apiKey: "https://cloud.siliconflow.cn/account/ak?referrer=clxty1xuy0014lvqwh5z50i88",
        docs: "https://docs.siliconflow.cn/",
        models: "https://docs.siliconflow.cn/docs/model-names"
      }
    },
    ollama: {
      enabled: true,
      name: "Ollama",
      icon: "ollama",
      api: {
        url: "http://localhost:11434"
      },
      websites: {
        official: "https://ollama.com/",
        docs: "https://github.com/ollama/ollama/tree/main/docs",
        models: "https://ollama.com/library"
      }
    },
    deepseek: {
      enabled: false,
      name: "DeepSeek",
      icon: "deepseek",
      api: {
        url: "https://api.deepseek.com"
      },
      websites: {
        official: "https://deepseek.com/",
        apiKey: "https://platform.deepseek.com/api_keys",
        docs: "https://platform.deepseek.com/api-docs/",
        models: "https://platform.deepseek.com/api-docs/"
      }
    },
    'gitee-ai': {
      enabled: false,
      name: "Gitee AI",
      icon: "gitee-ai",
      api: {
        url: "https://ai.gitee.com"
      },
      websites: {
        official: "https://ai.gitee.com/",
        apiKey: "https://ai.gitee.com/dashboard/settings/tokens",
        docs: "https://ai.gitee.com/docs/openapi/v1",
        models: "https://ai.gitee.com/serverless-api"
      }
    },
    yi: {
      enabled: false,
      name: "零一万物",
      icon: "yi",
      api: {
        url: "https://api.lingyiwanwu.com"
      },
      websites: {
        official: "https://platform.lingyiwanwu.com/",
        apiKey: "https://platform.lingyiwanwu.com/apikeys",
        docs: "https://platform.lingyiwanwu.com/docs",
        models: "https://platform.lingyiwanwu.com/docs#模型"
      }
    },
    groq: {
      enabled: false,
      name: "Groq",
      icon: "groq",
      api: {
        url: "https://api.groq.com/openai"
      },
      websites: {
        official: "https://groq.com/",
        apiKey: "https://console.groq.com/keys",
        docs: "https://console.groq.com/docs/quickstart",
        models: "https://console.groq.com/docs/models"
      }
    },
    zhipu: {
      enabled: false,
      name: "智谱 AI",
      icon: "zhipu",
      api: {
        url: "https://open.bigmodel.cn/api/paas/v4/"
      },
      websites: {
        official: "https://open.bigmodel.cn/",
        apiKey: "https://open.bigmodel.cn/usercenter/apikeys",
        docs: "https://open.bigmodel.cn/dev/howuse/introduction",
        models: "https://open.bigmodel.cn/modelcenter/square"
      }
    },
    moonshot: {
      enabled: false,
      name: "Moonshot AI",
      icon: "moonshot",
      api: {
        url: "https://api.moonshot.cn"
      },
      websites: {
        official: "https://moonshot.ai/",
        apiKey: "https://platform.moonshot.cn/console/api-keys",
        docs: "https://platform.moonshot.cn/docs/",
        models: "https://platform.moonshot.cn/docs/intro#模型列表"
      }
    },
    baichuan: {
      enabled: false,
      name: "百川智能",
      icon: "baichuan",
      api: {
        url: "https://api.baichuan-ai.com"
      },
      websites: {
        official: "https://www.baichuan-ai.com/",
        apiKey: "https://platform.baichuan-ai.com/console/apikey",
        docs: "https://platform.baichuan-ai.com/docs",
        models: "https://platform.baichuan-ai.com/price"
      }
    },
    modelscope: {
      enabled: false,
      name: "ModelScope",
      icon: "modelscope",
      api: {
        url: "https://api-inference.modelscope.cn/v1/"
      },
      websites: {
        official: "https://modelscope.cn",
        apiKey: "https://modelscope.cn/my/myaccesstoken",
        docs: "https://modelscope.cn/docs/model-service/API-Inference/intro",
        models: "https://modelscope.cn/models"
      }
    },
    xirang: {
      enabled: false,
      name: "天翼云祈",
      icon: "xirang",
      api: {
        url: "https://wishub-x1.ctyun.cn"
      },
      websites: {
        official: "https://www.ctyun.cn",
        apiKey: "https://huiju.ctyun.cn/service/serviceGroup",
        docs: "https://www.ctyun.cn/products/ctxirang",
        models: "https://huiju.ctyun.cn/modelSquare/"
      }
    },
    dashscope: {
      enabled: false,
      name: "通义千问",
      icon: "dashscope",
      api: {
        url: "https://dashscope.aliyuncs.com/compatible-mode/v1/"
      },
      websites: {
        official: "https://www.aliyun.com/product/bailian",
        apiKey: "https://bailian.console.aliyun.com/?apiKey=1#/api-key",
        docs: "https://help.aliyun.com/zh/model-studio/getting-started/",
        models: "https://bailian.console.aliyun.com/model-market#/model-market"
      }
    },
    stepfun: {
      enabled: false,
      name: "StepFun",
      icon: "stepfun",
      api: {
        url: "https://api.stepfun.com"
      },
      websites: {
        official: "https://platform.stepfun.com/",
        apiKey: "https://platform.stepfun.com/interface-key",
        docs: "https://platform.stepfun.com/docs/overview/concept",
        models: "https://platform.stepfun.com/docs/llm/text"
      }
    },
    doubao: {
      enabled: false,
      name: "火山方舟",
      icon: "doubao",
      api: {
        url: "https://ark.cn-beijing.volces.com/api/v3/"
      },
      websites: {
        official: "https://console.volcengine.com/ark/",
        apiKey: "https://www.volcengine.com/experience/ark?utm_term=202502dsinvite&ac=DSASUQY5&rc=DB4II4FC",
        docs: "https://www.volcengine.com/docs/82379/1182403",
        models: "https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint"
      }
    },
    minimax: {
      enabled: false,
      name: "MiniMax",
      icon: "minimax",
      api: {
        url: "https://api.minimax.chat/v1/"
      },
      websites: {
        official: "https://platform.minimaxi.com/",
        apiKey: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
        docs: "https://platform.minimaxi.com/document/Announcement",
        models: "https://platform.minimaxi.com/document/Models"
      }
    },
    openrouter: {
      enabled: false,
      name: "OpenRouter",
      icon: "openrouter",
      api: {
        url: "https://openrouter.ai/api/v1/"
      },
      websites: {
        official: "https://openrouter.ai/",
        apiKey: "https://openrouter.ai/settings/keys",
        docs: "https://openrouter.ai/docs/quick-start",
        models: "https://openrouter.ai/docs/models"
      }
    },
    lmstudio: {
      enabled: false,
      name: "LM Studio",
      icon: "lmstudio",
      api: {
        url: "http://localhost:1234"
      },
      websites: {
        official: "https://lmstudio.ai/",
        docs: "https://lmstudio.ai/docs",
        models: "https://lmstudio.ai/models"
      }
    },
    anthropic: {
      enabled: false,
      name: "Anthropic",
      icon: "anthropic",
      api: {
        url: "https://api.anthropic.com/"
      },
      websites: {
        official: "https://anthropic.com/",
        apiKey: "https://console.anthropic.com/settings/keys",
        docs: "https://docs.anthropic.com/en/docs",
        models: "https://docs.anthropic.com/en/docs/about-claude/models"
      }
    },
    grok: {
      enabled: false,
      name: "Grok",
      icon: "grok",
      api: {
        url: "https://api.x.ai"
      },
      websites: {
        official: "https://x.ai/",
        docs: "https://docs.x.ai/",
        models: "https://docs.x.ai/docs#getting-started"
      }
    },
    hyperbolic: {
      enabled: false,
      name: "Hyperbolic",
      icon: "hyperbolic",
      api: {
        url: "https://api.hyperbolic.xyz"
      },
      websites: {
        official: "https://app.hyperbolic.xyz",
        apiKey: "https://app.hyperbolic.xyz/settings",
        docs: "https://docs.hyperbolic.xyz",
        models: "https://app.hyperbolic.xyz/models"
      }
    },
    mistral: {
      enabled: false,
      name: "Mistral AI",
      icon: "mistral",
      api: {
        url: "https://api.mistral.ai"
      },
      websites: {
        official: "https://mistral.ai",
        apiKey: "https://console.mistral.ai/api-keys/",
        docs: "https://docs.mistral.ai",
        models: "https://docs.mistral.ai/getting-started/models/models_overview"
      }
    },
    jina: {
      enabled: false,
      name: "Jina AI",
      icon: "jina",
      api: {
        url: "https://api.jina.ai"
      },
      websites: {
        official: "https://jina.ai",
        apiKey: "https://jina.ai/",
        docs: "https://jina.ai",
        models: "https://jina.ai"
      }
    },
    aihubmix: {
      enabled: false,
      name: "AIHubMix",
      icon: "aihubmix",
      api: {
        url: "https://aihubmix.com"
      },
      websites: {
        official: "https://aihubmix.com?aff=SJyh",
        apiKey: "https://aihubmix.com?aff=SJyh",
        docs: "https://doc.aihubmix.com/",
        models: "https://aihubmix.com/models"
      }
    },
    fireworks: {
      enabled: false,
      name: "Fireworks AI",
      icon: "fireworks",
      api: {
        url: "https://api.fireworks.ai/inference"
      },
      websites: {
        official: "https://fireworks.ai/",
        apiKey: "https://fireworks.ai/account/api-keys",
        docs: "https://docs.fireworks.ai/getting-started/introduction",
        models: "https://fireworks.ai/dashboard/models"
      }
    },
    zhinao: {
      enabled: false,
      name: "360智脑",
      icon: "zhinao",
      api: {
        url: "https://api.360.cn"
      },
      websites: {
        official: "https://ai.360.com/",
        apiKey: "https://ai.360.com/platform/keys",
        docs: "https://ai.360.com/platform/docs/overview",
        models: "https://ai.360.com/platform/limit"
      }
    },
    hunyuan: {
      enabled: false,
      name: "腾讯混元",
      icon: "hunyuan",
      api: {
        url: "https://api.hunyuan.cloud.tencent.com"
      },
      websites: {
        official: "https://cloud.tencent.com/product/hunyuan",
        apiKey: "https://console.cloud.tencent.com/hunyuan/api-key",
        docs: "https://cloud.tencent.com/document/product/1729/111007",
        models: "https://cloud.tencent.com/document/product/1729/104753"
      }
    },
    nvidia: {
      enabled: false,
      name: "NVIDIA AI",
      icon: "nvidia",
      api: {
        url: "https://integrate.api.nvidia.com"
      },
      websites: {
        official: "https://build.nvidia.com/explore/discover",
        apiKey: "https://build.nvidia.com/meta/llama-3_1-405b-instruct",
        docs: "https://docs.api.nvidia.com/nim/reference/llm-apis",
        models: "https://build.nvidia.com/nim"
      }
    },
    'azure-openai': {
      enabled: false,
      name: "Azure OpenAI",
      icon: "azure-openai",
      api: {
        url: ""
      },
      websites: {
        official: "https://azure.microsoft.com/en-us/products/ai-services/openai-service",
        apiKey: "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI",
        docs: "https://learn.microsoft.com/en-us/azure/ai-services/openai/",
        models: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models"
      }
    },
    'baidu-cloud': {
      enabled: false,
      name: "百度智能云",
      icon: "baidu-cloud",
      api: {
        url: "https://qianfan.baidubce.com/v2/"
      },
      websites: {
        official: "https://cloud.baidu.com/",
        apiKey: "https://console.bce.baidu.com/iam/#/iam/apikey/list",
        docs: "https://cloud.baidu.com/doc/index.html",
        models: "https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu"
      }
    }
  }
};

/**
 * 默认用户设置
 */
const DEFAULT_USER_SETTINGS: UserSettings = {
  models: {
    defaultModels: {
      assistant: {
        providerId: '',
        modelId: '',
        name: '请选择模型'
      },
      topicNaming: {
        providerId: '',
        modelId: '',
        name: '请选择模型'
      },
      translation: {
        providerId: '',
        modelId: '',
        name: '请选择模型'
      }
    },
    providers: []
  },
  ui: {
    theme: 'system',
    fontSize: 14,
    language: 'zh-CN'
  },
  mcp: {
    servers: {}
  }
};

/**
 * 配置验证错误
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

interface Provider {
  id: string;
  enabled?: boolean;
  apiKey?: string;
  apiUrl?: string;
  models?: Model[];
}

/**
 * 配置管理服务
 */
export class ConfigService {
  private static instance: ConfigService;
  private initialized: boolean = false;
  
  private systemConfig: SystemConfig = DEFAULT_SYSTEM_CONFIG;
  private userSettings: UserSettings = DEFAULT_USER_SETTINGS;
  
  private readonly SYSTEM_CONFIG_FILE = 'system.json';
  private readonly USER_SETTINGS_FILE = 'settings.json';

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * 初始化配置服务
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 确保配置目录存在
      await directoryService.ensureDirectory(directoryService.getDirectory('config'));

      // 加载系统配置
      await this.loadSystemConfig();
      
      // 加载用户设置
      await this.loadUserSettings();

      this.initialized = true;
      console.log('配置服务初始化完成');
    } catch (error) {
      console.error('配置服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 加载系统配置
   */
  private async loadSystemConfig(): Promise<void> {
    const configPath = `${directoryService.getDirectory('config')}/${this.SYSTEM_CONFIG_FILE}`;
    
    try {
      const exists = await this.fileExists(configPath);
      if (!exists) {
        // 如果配置文件不存在，创建默认配置
        await this.saveSystemConfig(DEFAULT_SYSTEM_CONFIG);
        this.systemConfig = DEFAULT_SYSTEM_CONFIG;
        return;
      }

      const content = await this.readConfigFile(configPath);
      this.systemConfig = this.validateSystemConfig(JSON.parse(content));
    } catch (error) {
      console.error('加载系统配置失败:', error);
      throw error;
    }
  }

  /**
   * 加载用户设置
   */
  private async loadUserSettings(): Promise<void> {
    const settingsPath = `${directoryService.getDirectory('config')}/${this.USER_SETTINGS_FILE}`;
    
    try {
      const exists = await this.fileExists(settingsPath);
      if (!exists) {
        // 如果设置文件不存在，创建默认设置
        await this.saveUserSettings(DEFAULT_USER_SETTINGS);
        this.userSettings = DEFAULT_USER_SETTINGS;
        return;
      }

      const content = await this.readConfigFile(settingsPath);
      this.userSettings = this.validateUserSettings(JSON.parse(content));
    } catch (error) {
      console.error('加载用户设置失败:', error);
      throw error;
    }
  }

  /**
   * 保存系统配置
   */
  private async saveSystemConfig(config: SystemConfig): Promise<void> {
    const configPath = `${directoryService.getDirectory('config')}/${this.SYSTEM_CONFIG_FILE}`;
    await this.writeConfigFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * 保存用户设置
   */
  private async saveUserSettings(settings: UserSettings): Promise<void> {
    const settingsPath = `${directoryService.getDirectory('config')}/${this.USER_SETTINGS_FILE}`;
    await this.writeConfigFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  /**
   * 验证系统配置
   */
  private validateSystemConfig(config: any): SystemConfig {
    try {
      // 1. 验证基本结构
      if (!config || typeof config !== 'object') {
        throw new ConfigValidationError('配置必须是一个对象');
      }

      // 2. 验证并合并路径配置
      const paths = {
        ...DEFAULT_SYSTEM_CONFIG.paths,
        ...(config.paths || {}),
      };

      // 确保所有路径都是字符串
      Object.entries(paths).forEach(([key, value]) => {
        if (typeof value !== 'string') {
          throw new ConfigValidationError(`路径 ${key} 必须是字符串`);
        }
      });

      // 3. 验证并合并数据库配置
      const database = {
        ...DEFAULT_SYSTEM_CONFIG.database,
        ...(config.database || {}),
      };

      if (typeof database.filename !== 'string') {
        throw new ConfigValidationError('数据库文件名必须是字符串');
      }
      if (typeof database.maxSize !== 'number' || database.maxSize <= 0) {
        throw new ConfigValidationError('数据库大小限制必须是正数');
      }

      // 4. 验证并合并日志配置
      const logging = {
        ...DEFAULT_SYSTEM_CONFIG.logging,
        ...(config.logging || {}),
      };

      if (!['debug', 'info', 'warn', 'error'].includes(logging.level)) {
        throw new ConfigValidationError('无效的日志级别');
      }
      if (typeof logging.maxFiles !== 'number' || logging.maxFiles <= 0) {
        throw new ConfigValidationError('最大日志文件数必须是正数');
      }

      // 5. 验证并合并供应商配置
      const providers = {
        ...DEFAULT_SYSTEM_CONFIG.providers,
        ...(config.providers || {}),
      };

      // 6. 返回验证后的配置
      return {
        paths,
        database,
        logging,
        providers,
      };
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        console.error('系统配置验证失败:', error.message);
        // 返回默认配置
        return { ...DEFAULT_SYSTEM_CONFIG };
      }
      throw error;
    }
  }

  /**
   * 验证用户设置
   */
  private validateUserSettings(settings: any): UserSettings {
    try {
      // 1. 验证基本结构
      if (!settings || typeof settings !== 'object') {
        throw new ConfigValidationError('设置必须是一个对象');
      }

      // 2. 验证并合并模型配置
      const models = {
        ...DEFAULT_USER_SETTINGS.models,
        ...(settings.models || {}),
      };

      // 验证 defaultModels 结构
      if (!models.defaultModels || typeof models.defaultModels !== 'object') {
        models.defaultModels = DEFAULT_USER_SETTINGS.models.defaultModels;
      } else {
        // 验证每个默认模型的配置
        const validateModelConfig = (config: any) => {
          if (!config || typeof config !== 'object') {
            return false;
          }
          return (
            typeof config.providerId === 'string' &&
            typeof config.modelId === 'string' &&
            typeof config.name === 'string'
          );
        };

        // 验证 assistant 配置
        if (!validateModelConfig(models.defaultModels.assistant)) {
          models.defaultModels.assistant = DEFAULT_USER_SETTINGS.models.defaultModels.assistant;
        }

        // 验证 topicNaming 配置
        if (!validateModelConfig(models.defaultModels.topicNaming)) {
          models.defaultModels.topicNaming = DEFAULT_USER_SETTINGS.models.defaultModels.topicNaming;
        }

        // 验证 translation 配置
        if (!validateModelConfig(models.defaultModels.translation)) {
          models.defaultModels.translation = DEFAULT_USER_SETTINGS.models.defaultModels.translation;
        }
      }

      // 验证 providers 数组
      if (!Array.isArray(models.providers)) {
        models.providers = [];
      } else {
        models.providers = models.providers.map((provider: Provider) => {
          if (!provider.id || typeof provider.id !== 'string') {
            throw new ConfigValidationError('提供商ID必须是字符串');
          }
          
          // 验证可选字段
          if (provider.apiKey && typeof provider.apiKey !== 'string') {
            throw new ConfigValidationError('API密钥必须是字符串');
          }
          if (provider.apiUrl && typeof provider.apiUrl !== 'string') {
            throw new ConfigValidationError('API URL必须是字符串');
          }
          if (provider.models && !Array.isArray(provider.models)) {
            throw new ConfigValidationError('模型列表必须是数组');
          }

          return {
            id: provider.id,
            enabled: provider.enabled ?? true,
            apiKey: provider.apiKey,
            apiUrl: provider.apiUrl,
            models: provider.models || [],
          };
        });
      }

      // 3. 验证并合并UI配置
      const ui = {
        ...DEFAULT_USER_SETTINGS.ui,
        ...(settings.ui || {}),
      };

      if (!['light', 'dark', 'system'].includes(ui.theme)) {
        ui.theme = DEFAULT_USER_SETTINGS.ui.theme;
      }
      if (typeof ui.fontSize !== 'number' || ui.fontSize < 8 || ui.fontSize > 32) {
        ui.fontSize = DEFAULT_USER_SETTINGS.ui.fontSize;
      }
      if (typeof ui.language !== 'string') {
        ui.language = DEFAULT_USER_SETTINGS.ui.language;
      }

      // 4. 验证并合并 mcp 配置
      const mcp = {
        ...DEFAULT_USER_SETTINGS.mcp,
        ...(settings.mcp || {}),
      };

      // 5. 返回验证后的设置
      return {
        models,
        ui,
        mcp,
      };
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        console.error('用户设置验证失败:', error.message);
        // 返回默认设置
        return { ...DEFAULT_USER_SETTINGS };
      }
      throw error;
    }
  }

  /**
   * 读取配置文件
   */
  private async readConfigFile(path: string): Promise<string> {
    try {
      return await readTextFile(path, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error(`读取配置文件失败: ${path}`, error);
      throw error;
    }
  }

  /**
   * 写入配置文件
   */
  private async writeConfigFile(path: string, content: string): Promise<void> {
    try {
      await writeTextFile(path, content, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error(`写入配置文件失败: ${path}`, error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      return await exists(path, { baseDir: BaseDirectory.AppData });
    } catch (error) {
      console.error(`检查文件是否存在失败: ${path}`, error);
      throw error;
    }
  }

  /**
   * 获取系统配置
   */
  public getSystemConfig(): SystemConfig {
    return { ...this.systemConfig };
  }

  /**
   * 获取用户设置
   */
  public getUserSettings(): UserSettings {
    return { ...this.userSettings };
  }

  /**
   * 更新用户设置
   */
  public async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    // 深度合并新旧设置
    const mergedSettings = this.deepMerge(this.userSettings, settings);
    
    // 验证合并后的设置
    this.userSettings = this.validateUserSettings(mergedSettings);
    
    // 保存到文件
    await this.saveUserSettings(this.userSettings);
  }

  /**
   * 深度合并对象
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const merged = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (
          sourceValue &&
          targetValue &&
          typeof sourceValue === 'object' &&
          typeof targetValue === 'object' &&
          !Array.isArray(sourceValue) &&
          !Array.isArray(targetValue)
        ) {
          merged[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          merged[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return merged;
  }

  /**
   * 重置用户设置
   */
  public async resetUserSettings(): Promise<void> {
    this.userSettings = DEFAULT_USER_SETTINGS;
    await this.saveUserSettings(DEFAULT_USER_SETTINGS);
  }

  /**
   * 获取所有启用的供应商配置
   */
  public getEnabledProviders(): Array<ProviderConfig & { id: string }> {
    return Object.entries(this.systemConfig.providers)
      .filter(([_, provider]) => provider.enabled)
      .map(([id, provider]) => ({
        id,
        ...provider
      }));
  }

  /**
   * 获取特定供应商配置
   */
  public getProviderConfig(id: string): ProviderConfig | null {
    return this.systemConfig.providers[id] || null;
  }

  /**
   * 更新供应商配置
   */
  public async updateProviderConfig(id: string, config: Partial<ProviderConfig>): Promise<void> {
    if (!this.systemConfig.providers[id]) {
      throw new Error(`Provider ${id} not found`);
    }

    this.systemConfig.providers[id] = {
      ...this.systemConfig.providers[id],
      ...config
    };

    await this.saveSystemConfig(this.systemConfig);
  }

  /**
   * 获取供应商图标
   */
  public getProviderIcon(providerId: string): string | undefined {
    const provider = this.systemConfig.providers[providerId];
    return provider?.icon;
  }

  /**
   * 获取供应商网站信息
   */
  public getProviderWebsites(providerId: string): ProviderConfig['websites'] | null {
    const provider = this.systemConfig.providers[providerId];
    return provider?.websites || null;
  }

  /**
   * 获取供应商 API 配置
   */
  public getProviderApiConfig(providerId: string): ProviderConfig['api'] | null {
    const provider = this.systemConfig.providers[providerId];
    return provider?.api || null;
  }

  /**
   * 获取聊天数据目录路径
   */
  public getAppChatsData(): string {
    return this.systemConfig.paths.chats;
  }

  /**
   * 启用/禁用供应商
   */
  public async toggleProvider(providerId: string, enabled: boolean): Promise<void> {
    const provider = this.systemConfig.providers[providerId];
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    provider.enabled = enabled;
    await this.saveSystemConfig(this.systemConfig);
  }
}

// 导出单例实例
export const configService = ConfigService.getInstance(); 