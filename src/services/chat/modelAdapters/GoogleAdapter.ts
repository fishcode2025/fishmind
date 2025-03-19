import { IModelAdapter } from "./IModelAdapter";
import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";

/**
 * Google 模型适配器
 * 基于 GoogleChatService 的实现
 */
export class GoogleAdapter implements IModelAdapter {
  /**
   * 将 MCP 工具转换为 Google 工具格式
   * @param tool MCP 工具
   * @returns Google 格式的工具定义
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
      // Google Gemini 不支持 additionalProperties
      if (prop.items) {
        delete prop.items["additionalProperties"];
      }
      properties[key] = {
        type: prop.type,
        description: prop.description,
        items: prop.items,
      };
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
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
        role: "model",
        parts: [
          {
            functionCall: {
              name: toolName,
              args: args,
            },
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: toolName,
              response: {
                name: toolName,
                content: typeof result === "string" ? result : result.content,
              },
            },
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
    if (
      !response ||
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content
    ) {
      return [];
    }

    const content = response.candidates[0].content;
    if (!content.parts || !Array.isArray(content.parts)) {
      return [];
    }

    const toolCalls = [];
    for (const part of content.parts) {
      if (part.functionCall) {
        toolCalls.push({
          id: `google-tool-${toolCalls.length}`,
          name: part.functionCall.name,
          args: part.functionCall.args,
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
    if (
      !response ||
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content
    ) {
      return false;
    }

    const content = response.candidates[0].content;
    if (!content.parts || !Array.isArray(content.parts)) {
      return false;
    }

    return content.parts.some((part: any) => part.functionCall);
  }

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return "google";
  }

  /**
   * 准备请求消息
   * @param messages 原始消息列表
   * @param systemPrompt 系统提示词（可选）
   * @returns 格式化后的请求消息
   */
  prepareMessages(messages: any[], systemPrompt?: string): any[] {
    const result = [];

    // 对于 Google，系统提示词会作为第一条用户消息
    if (systemPrompt) {
      result.push({
        role: "user",
        parts: [{ text: systemPrompt }],
      });

      // 如果有系统提示词，添加一个空的模型回复
      result.push({
        role: "model",
        parts: [{ text: "我明白了，我会按照您的要求行事。" }],
      });
    }

    // 添加用户消息和助手消息
    for (const msg of messages) {
      if (msg.role === "system") {
        // 对于 Google，系统消息会被转换为用户消息
        result.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "user") {
        result.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "assistant") {
        result.push({
          role: "model",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "tool") {
        result.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response: {
                  name: msg.name,
                  content:
                    typeof msg.content === "string"
                      ? msg.content
                      : JSON.stringify(msg.content),
                },
              },
            },
          ],
        });
      }
    }

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
    const payload: any = {
      contents: messages,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools,
        },
      ];
    }

    // 添加流式响应设置
    if (stream) {
      payload.stream = true;
    }

    return payload;
  }

  /**
   * 从响应中提取内容
   * @param response 模型响应
   * @returns 提取的内容
   */
  extractContentFromResponse(response: any): string {
    if (
      !response ||
      !response.candidates ||
      !response.candidates[0] ||
      !response.candidates[0].content
    ) {
      return "";
    }

    const content = response.candidates[0].content;
    if (!content.parts || !Array.isArray(content.parts)) {
      return "";
    }

    // 合并所有文本内容
    return content.parts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join("");
  }

  /**
   * 构建请求体
   * @param messages 请求消息
   * @param responseContext 响应上下文
   * @param tools 工具列表（可选）
   * @returns 格式化后的请求体
   */
  buildRequestBody(
    messages: any[],
    responseContext: ModelResponseContext,
    tools?: any[]
  ): any {
    // 获取配置信息
    const temperature = responseContext.getMetadata("temperature") || 0.7;
    const maxTokens = responseContext.getMetadata("maxTokens") || 2048;

    const payload: any = {
      contents: messages,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: tools,
        },
      ];
    }

    // 添加流式响应设置
    payload.stream = true;

    return payload;
  }

  /**
   * 从流式响应块中解析数据
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any {
    // TODO: 实现谷歌模型流式响应解析
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
    // TODO: 确认Google模型是否支持嵌入式工具调用
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
