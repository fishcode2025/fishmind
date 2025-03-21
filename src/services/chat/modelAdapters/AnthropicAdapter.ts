import { IModelAdapter } from "./IModelAdapter";
import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";
import { AiModel, AiModelProvider } from "../../../models/chat";

/**
 * Anthropic 模型适配器
 * 基于 AnthropicChatService 的实现
 */
export class AnthropicAdapter implements IModelAdapter {
  /**
   * 将 MCP 工具转换为 Anthropic 工具格式
   * @param tool MCP 工具
   * @returns Anthropic 格式的工具定义
   */
  formatTool(tool: IMcpTool): any {
    if (Object.keys(tool.inputSchema.properties).length === 0) {
      return {
        name: tool.name,
        description: tool.description,
      };
    }

    const properties: any = {};
    for (const key in tool.inputSchema.properties) {
      const prop = tool.inputSchema.properties[key];
      properties[key] = {
        type: prop.type,
        description: prop.description,
        items: prop.items,
      };
    }

    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: tool.inputSchema.type,
        properties: properties,
        required: tool.inputSchema.required,
      },
    };
  }

  /**
   * 格式化工具调用结果为模型可接受的消息格式
   * @param toolName 工具名称
   * @param toolCallId 工具调用 ID
   * @param args 工具参数
   * @param result 工具调用结果
   * @returns 格式化后的消息数组
   */
  formatToolCallResult(
    toolName: string,
    toolCallId: string,
    args: any,
    result: any
  ): any[] {
    return [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: toolCallId,
            name: toolName,
            input: typeof args === "string" ? args : JSON.stringify(args),
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolCallId,
            content: typeof result === "string" ? result : result.content,
          },
        ],
      },
    ];
  }

  /**
   * 从模型响应中提取工具调用
   * @param response 模型响应
   * @returns 工具调用数组
   */
  extractToolCalls(response: any): any[] {
    if (!response || !response.content || !Array.isArray(response.content)) {
      return [];
    }

    const toolCalls = [];
    for (const item of response.content) {
      if (item.type === "tool_use") {
        let args = item.input;
        try {
          // Anthropic 返回的参数可能是字符串，需要解析为对象
          if (typeof args === "string") {
            args = JSON.parse(args);
          }
        } catch (e) {
          console.error("Failed to parse tool call arguments", e);
        }

        toolCalls.push({
          id: item.id,
          name: item.name,
          args: args,
        });
      }
    }

    return toolCalls;
  }

  /**
   * 检查响应是否包含工具调用
   * @param response 模型响应
   * @returns 是否包含工具调用
   */
  hasToolCalls(response: any): boolean {
    if (!response || !response.content || !Array.isArray(response.content)) {
      return false;
    }

    return response.content.some((item: any) => item.type === "tool_use");
  }

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return "anthropic";
  }

  /**
   * 准备请求消息
   * @param messages 原始消息列表
   * @param systemPrompt 系统提示词（可选）
   * @returns 格式化后的请求消息和系统提示词
   */
  prepareMessages(messages: any[], systemPrompt?: string): any[] {
    const result: any[] = [];

    // 添加系统提示词
    let systemContent = "";
    if (systemPrompt) {
      systemContent = systemPrompt;
    }

    // 添加用户消息和助手消息
    for (const msg of messages) {
      if (msg.role === "system") {
        // 对于 Anthropic，系统消息会被合并
        systemContent += "\n" + msg.content;
      } else if (msg.role === "tool") {
        result.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.tool_call_id,
              content:
                typeof msg.content === "string"
                  ? msg.content
                  : JSON.stringify(msg.content),
            },
          ],
        });
      } else if (
        msg.role === "assistant" &&
        msg.content &&
        Array.isArray(msg.content) &&
        msg.content.some((item: any) => item.type === "tool_use")
      ) {
        result.push(msg);
      } else {
        result.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // 使用符号属性存储系统提示词
    // @ts-ignore - 我们使用一个特殊的Symbol来存储systemContent，这样不会干扰消息数组
    result.systemContent = systemContent;

    return result;
  }

  /**
   * 准备请求体
   * @param messages 请求消息
   * @param model 模型名称
   * @param temperature 温度
   * @param maxTokens 最大令牌数
   * @param tools 工具列表（可选）
   * @param stream 是否启用流式响应
   * @returns 格式化后的请求体
   */
  prepareRequestBody(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    tools?: any[],
    stream?: boolean
  ): any {
    // 提取系统内容
    // @ts-ignore - 访问我们之前存储的系统内容
    const systemContent = messages.systemContent || "";

    // 不修改原始消息数组
    const messagesWithoutSystem = [...messages];

    const payload: any = {
      model,
      messages: messagesWithoutSystem,
      temperature,
      max_tokens: maxTokens,
      stream: stream || false,
    };

    // 添加系统提示词
    if (systemContent) {
      payload.system = systemContent;
    }

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    return payload;
  }

  /**
   * 从响应中提取内容
   * @param response 模型响应
   * @returns 提取的内容
   */
  extractContentFromResponse(response: any): string {
    if (response && response.content) {
      if (Array.isArray(response.content)) {
        // 合并所有文本内容
        return response.content
          .filter((item: any) => item.type === "text")
          .map((item: any) => item.text)
          .join("");
      } else {
        return response.content;
      }
    }
    return "";
  }

  /**
   * 构建请求体
   * @param messages 请求消息
   * @param responseContext 响应上下文
   * @param provider 提供商
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
  ): any {
    // 提取系统内容
    // @ts-ignore - 访问我们之前存储的系统内容
    const systemContent = messages.systemContent || "";

    // 获取模型配置信息
    const modelId = model?.modelId || 
      responseContext.getMetadata("modelId") || "claude-3-haiku-20240307";
    const temperature = responseContext.getMetadata("temperature") || 0.7;
    const maxTokens = responseContext.getMetadata("maxTokens") || 4096;

    const payload: any = {
      model: modelId,
      messages: [...messages], // 复制数组以避免修改原始数据
      temperature,
      max_tokens: maxTokens,
      stream: true,
    };

    // 添加系统提示词
    if (systemContent) {
      payload.system = systemContent;
    }

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    return payload;
  }

  /**
   * 从流式响应块中解析数据
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any {
    // TODO: 实现流式响应解析
    if (typeof chunk !== "string") {
      chunk = new TextDecoder().decode(chunk);
    }

    // 移除前缀 "data: "
    const dataString = chunk.replace(/^data: /, "");
    if (dataString === "[DONE]") {
      return { done: true };
    }

    try {
      return JSON.parse(dataString);
    } catch (e) {
      console.error("Failed to parse stream chunk", e);
      return null;
    }
  }

  /**
   * 判断模型是否支持嵌入式工具调用
   * @returns 是否支持嵌入式工具调用
   */
  supportsEmbeddedToolCalls(): boolean {
    // TODO: 确认Anthropic是否支持嵌入式工具调用
    return false;
  }

  /**
   * 从响应中提取嵌入式工具调用
   * @param response 模型响应
   * @returns 嵌入式工具调用列表
   */
  extractEmbeddedToolCalls(response: any): any[] {
    // TODO: 实现嵌入式工具调用提取
    return [];
  }
}
