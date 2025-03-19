import { AiModelProvider, AiModel } from "@/models/chat";

/**
 * 构建API请求URL
 * @param provider 模型提供商
 * @param model 模型信息
 * @returns 完整的API请求URL
 */
export function buildRequestUrl(
  provider: AiModelProvider,
  model: AiModel
): string {
  // 从提供商配置中获取基础URL
  const baseUrl = provider.apiUrl || "";

  // 如果没有基础URL，抛出错误
  if (!baseUrl) {
    throw new Error(`提供商 ${provider.name} 缺少baseUrl配置`);
  }

  // 根据提供商类型构建不同的URL
  switch (provider.id) {
    case "openai":
      return `${baseUrl}/v1/chat/completions`;
    case "anthropic":
      return `${baseUrl}/v1/messages`;
    case "google":
      return `${baseUrl}/v1/models/${model.id}:generateContent`;
    case "ollama":
      return `${baseUrl}/api/chat`;
    case "lmstudio":
      return `${baseUrl}/v1/chat/completions`;
    default:
      // 默认使用通用OpenAI兼容格式
      return `${baseUrl}/v1/chat/completions`;
  }
}

/**
 * 推断模型的提供商类型
 * @param modelId 模型ID
 * @returns 推断的提供商类型
 */
export function inferProviderType(modelId: string): string {
  const modelIdLower = modelId.toLowerCase();

  if (
    modelIdLower.includes("gpt") ||
    modelIdLower.startsWith("text-") ||
    modelIdLower.includes("openai")
  ) {
    return "openai";
  }

  if (modelIdLower.includes("claude") || modelIdLower.includes("anthropic")) {
    return "anthropic";
  }

  if (modelIdLower.includes("gemini") || modelIdLower.includes("palm")) {
    return "google";
  }

  if (modelIdLower.includes("llama") || modelIdLower.includes("mixtral")) {
    return "ollama";
  }

  // 默认返回通用类型
  return "openai";
}
