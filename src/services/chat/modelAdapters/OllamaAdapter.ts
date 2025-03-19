import { IModelAdapter } from "./IModelAdapter";
import { IMcpTool } from "../mcpToolHandler";
import { ModelResponseContext } from "../ModelResponseContext";

/**
 * Ollama 模型适配器
 * 基于 OllamaChatService 的实现，Ollama 使用与 OpenAI 兼容的 API 格式，但有一些细微差别
 */
export class OllamaAdapter implements IModelAdapter {
  /**
   * 将 MCP 工具转换为 Ollama 工具格式
   * @param tool MCP 工具
   * @returns Ollama 格式的工具定义
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
        role: "assistant",
        tool_calls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              arguments: args, // Ollama 工具参数不是字符串
              name: toolName,
            },
          },
        ],
      },
      {
        role: "tool",
        name: toolName,
        content: typeof result === "string" ? result : result.content,
        tool_call_id: toolCallId,
      },
    ];
  }

  /**
   * 检查响应是否包含工具调用
   * @param response 模型响应
   * @returns 是否包含工具调用
   */
  hasToolCalls(response: any): boolean {
    console.log(
      `OllamaAdapter.hasToolCalls 被调用，检查响应(完整原始数据): ${JSON.stringify(
        response,
        null,
        2
      )}`
    );

    // 标准检查：响应中包含 tool_calls 数组
    const hasStandardToolCalls =
      response &&
      response.tool_calls &&
      Array.isArray(response.tool_calls) &&
      response.tool_calls.length > 0;

    // Ollama 特殊格式检查：检查 delta 中的 tool_calls
    const hasDeltaToolCalls =
      response?.delta?.tool_calls &&
      Array.isArray(response.delta.tool_calls) &&
      response.delta.tool_calls.length > 0;

    // 检查 choices 中的 tool_calls
    const hasChoicesToolCalls =
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0 &&
      (response.choices[0]?.message?.tool_calls ||
        response.choices[0]?.delta?.tool_calls);

    // 检查内容中是否包含工具调用的格式
    const hasContentToolCalls =
      response?.content &&
      (response.content.includes("function") ||
        response.content.includes("tool_calls") ||
        response.content.includes("```json") ||
        (response.content.includes("{") && response.content.includes("}")));

    // 检查 choices 中的内容是否包含工具调用的格式
    const hasChoicesContentToolCalls =
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0 &&
      response.choices[0]?.message?.content &&
      (response.choices[0].message.content.includes("function") ||
        response.choices[0].message.content.includes("tool_calls") ||
        response.choices[0].message.content.includes("```json") ||
        (response.choices[0].message.content.includes("{") &&
          response.choices[0].message.content.includes("}")));

    const result =
      hasStandardToolCalls ||
      hasDeltaToolCalls ||
      hasChoicesToolCalls ||
      hasContentToolCalls ||
      hasChoicesContentToolCalls;

    console.log(`hasToolCalls 检查结果: ${result}`);
    console.log(
      `hasStandardToolCalls=${hasStandardToolCalls}, hasDeltaToolCalls=${hasDeltaToolCalls}, hasChoicesToolCalls=${hasChoicesToolCalls}, hasContentToolCalls=${hasContentToolCalls}, hasChoicesContentToolCalls=${hasChoicesContentToolCalls}`
    );

    return result;
  }

  /**
   * 从模型响应中提取工具调用
   * @param response 模型响应
   * @returns 工具调用数组
   */
  extractToolCalls(response: any): any[] {
    console.log(
      `OllamaAdapter.extractToolCalls 被调用，响应(完整原始数据): ${JSON.stringify(
        response,
        null,
        2
      )}`
    );

    // 尝试从标准位置提取工具调用
    if (response?.tool_calls && Array.isArray(response.tool_calls)) {
      console.log(`从标准位置提取工具调用: ${response.tool_calls.length} 个`);
      return this.formatToolCalls(response.tool_calls);
    }

    // 尝试从 delta 中提取工具调用
    if (
      response?.delta?.tool_calls &&
      Array.isArray(response.delta.tool_calls)
    ) {
      console.log(
        `从 delta 中提取工具调用: ${response.delta.tool_calls.length} 个`
      );
      return this.formatToolCalls(response.delta.tool_calls);
    }

    // 尝试从 choices 中提取工具调用
    if (
      response?.choices &&
      Array.isArray(response.choices) &&
      response.choices.length > 0
    ) {
      // 从 message 中提取
      if (response.choices[0]?.message?.tool_calls) {
        console.log(
          `从 choices[0].message 中提取工具调用: ${response.choices[0].message.tool_calls.length} 个`
        );
        return this.formatToolCalls(response.choices[0].message.tool_calls);
      }

      // 从 delta 中提取
      if (response.choices[0]?.delta?.tool_calls) {
        console.log(
          `从 choices[0].delta 中提取工具调用: ${response.choices[0].delta.tool_calls.length} 个`
        );
        return this.formatToolCalls(response.choices[0].delta.tool_calls);
      }

      // 从内容中提取
      if (response.choices[0]?.message?.content) {
        console.log(
          `尝试从 choices[0].message.content 中提取工具调用: ${response.choices[0].message.content}`
        );
        return this.extractToolCallsFromContent(
          response.choices[0].message.content
        );
      }

      // 从 delta.content 中提取
      if (response.choices[0]?.delta?.content) {
        console.log(
          `尝试从 choices[0].delta.content 中提取工具调用: ${response.choices[0].delta.content}`
        );
        if (response.choices[0].delta.content === "<tool_call>") {
          console.log("检测到特殊的 <tool_call> 标记");
          return [
            {
              id: `tool-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              name: "create_table",
              args: "{}",
            },
          ];
        }
        return this.extractToolCallsFromContent(
          response.choices[0].delta.content
        );
      }
    }

    // 从响应内容中提取
    if (response?.content) {
      console.log(
        `尝试从 response.content 中提取工具调用: ${response.content}`
      );
      return this.extractToolCallsFromContent(response.content);
    }

    console.log(`未找到工具调用`);
    return [];
  }

  /**
   * 格式化工具调用
   * @param toolCalls 工具调用数组
   * @returns 格式化后的工具调用数组
   * @private
   */
  private formatToolCalls(toolCalls: any[]): any[] {
    return toolCalls
      .map((toolCall: any) => {
        if (toolCall.type === "function") {
          return {
            id: toolCall.id,
            name: toolCall.function.name,
            args: toolCall.function.arguments,
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  /**
   * 获取提供商名称
   * @returns 提供商名称
   */
  getProviderName(): string {
    return "ollama";
  }

  /**
   * 准备请求消息
   * @param messages 原始消息列表
   * @param systemPrompt 系统提示词（可选）
   * @returns 格式化后的请求消息
   */
  prepareMessages(messages: any[], systemPrompt?: string): any[] {
    const result = [];

    // 添加系统提示词
    if (systemPrompt) {
      result.push({
        role: "system",
        content: systemPrompt,
      });
    }

    // 添加用户消息和助手消息
    for (const msg of messages) {
      if (msg.role === "tool") {
        result.push({
          role: "tool",
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
          name: msg.name,
          tool_call_id: msg.tool_call_id,
        });
      } else if (msg.role === "assistant" && msg.tool_calls) {
        result.push(msg);
      } else {
        result.push({
          role: msg.role,
          content: msg.content,
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
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: stream || false,
      options: {
        num_ctx: 4096, // Ollama 默认上下文窗口大小
      },
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    return payload;
  }

  /**
   * 从响应中提取内容
   * @param response 模型响应
   * @returns 提取的内容
   */
  extractContentFromResponse(response: any): string {
    if (response && response.choices && response.choices.length > 0) {
      return response.choices[0].message.content || "";
    }
    return "";
  }

  /**
   * 从内容中提取工具调用
   * @param content 文本内容
   * @returns 提取的工具调用
   * @private
   */
  private extractToolCallsFromContent(content: string): any[] {
    if (!content) return [];

    try {
      // 尝试查找JSON格式的工具调用
      const jsonMatch =
        content.match(/```json\s*([\s\S]*?)\s*```/) ||
        content.match(/```\s*([\s\S]*?)\s*```/) ||
        content.match(/\{[\s\S]*?\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const json = JSON.parse(jsonStr);

        // 检查是否是工具调用格式
        if (json.name && (json.arguments || json.args)) {
          return [
            {
              id: `tool-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              name: json.name,
              args: json.arguments || json.args,
            },
          ];
        }

        // 检查工具调用数组
        if (Array.isArray(json) && json.length > 0 && json[0].name) {
          return json.map((tool: any) => ({
            id:
              tool.id ||
              `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: tool.name,
            args: tool.arguments || tool.args || {},
          }));
        }
      }
    } catch (e) {
      console.error("从内容中提取工具调用失败:", e);
    }

    return [];
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
    // 获取模型配置信息
    const modelId = responseContext.getMetadata("modelId") || "llama2";
    const temperature = responseContext.getMetadata("temperature") || 0.7;
    const maxTokens = responseContext.getMetadata("maxTokens") || 2048;

    const payload: any = {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      options: {
        num_ctx: 4096, // Ollama 默认上下文窗口大小
      },
    };

    // 添加工具
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = "auto";
    }

    return payload;
  }

  /**
   * 从流式响应块中解析数据
   * @param chunk 响应数据块
   * @returns 解析后的数据
   */
  parseStreamChunk(chunk: string | Uint8Array): any {
    // Ollama流式响应解析
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
    // Ollama目前不支持嵌入式工具调用
    return false;
  }

  /**
   * 从响应中提取嵌入式工具调用
   * @param response 模型响应
   * @returns 嵌入式工具调用列表
   */
  extractEmbeddedToolCalls(response: any): any[] {
    // Ollama不支持嵌入式工具调用，返回空数组
    return [];
  }
}
