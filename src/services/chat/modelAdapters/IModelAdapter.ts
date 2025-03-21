import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";
import { AiModel, AiModelProvider } from "../../../models/chat";

/**
 * 模型适配器接口
 * 用于标准化不同模型的工具调用格式
 */
export interface IModelAdapter {
  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string;

  /**
   * 格式化工具为模型可用的格式
   * @param tool MCP工具
   * @returns 格式化后的工具
   */
  formatTool(tool: any): any;

  /**
   * 检查模型响应中是否包含工具调用
   * @param message 模型响应消息
   * @returns 是否包含工具调用
   */
  hasToolCalls(message: any): boolean;

  /**
   * 从模型响应中提取工具调用
   * @param message 模型响应消息
   * @returns 工具调用列表
   */
  extractToolCalls(message: any): any[];

  /**
   * 格式化工具调用结果为模型可用的格式
   * @param toolName 工具名称
   * @param toolCallId 工具调用ID
   * @param args 工具调用参数
   * @param result 工具调用结果
   * @returns 格式化后的工具调用结果消息
   */
  formatToolCallResult(
    toolName: string,
    toolCallId: string,
    args: any,
    result: any
  ): any[];

  /**
   * 准备请求消息
   * @param messages 原始消息列表
   * @param systemPrompt 系统提示词（可选）
   * @returns 格式化后的请求消息
   */
  prepareMessages(messages: any[], systemPrompt?: string): any[];

  /**
   * 准备请求体
   * @param messages 请求消息
   * @param responseContext 响应上下文
   * @param provider 模型提供商
   * @param model 模型
   * @param tools 工具列表（可选）
   * @returns 格式化后的请求体
   */
  buildRequestBody(
    messages: any[],
    responseContext: ModelResponseContext,
    provider: AiModelProvider,
    model: AiModel,
    tools?: any[]
  ): any;

  /**
   * 从响应中提取内容
   * @param response 模型响应
   * @returns 提取的内容
   */
  extractContentFromResponse(response: any): string;

  /**
   * 从流式响应块中解析数据
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any;

  /**
   * 判断模型是否支持嵌入式工具调用
   * @returns 是否支持嵌入式工具调用
   */
  supportsEmbeddedToolCalls(): boolean;

  /**
   * 从响应中提取嵌入式工具调用
   * @param response 模型响应
   * @returns 嵌入式工具调用列表
   */
  extractEmbeddedToolCalls(response: any): any[];
}
