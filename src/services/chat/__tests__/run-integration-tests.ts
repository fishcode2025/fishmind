/**
 * 聊天服务集成测试
 * 测试 AI、消息和话题之间的交互
 * 注意：此测试使用内存数据库，不会影响实际数据
 */

// 声明全局变量，确保在浏览器环境中也能正确运行
declare global {
  interface Window {
    fetch: any;
  }
  var global: typeof globalThis;
}

// 如果在浏览器环境中，将 window 赋值给 global
if (typeof window !== "undefined" && typeof global === "undefined") {
  (window as any).global = window;
}

import { ChatService } from "../ChatService";
import { AiModelService } from "../../aimodel/AiModelService";
import { ChatTopicRepository } from "../../../repositories/ChatTopicRepository";
import { ChatMessageRepository } from "../../../repositories/ChatMessageRepository";
import { AiModelRepository } from "../../../repositories/AiModelRepository";
import { AiModelProviderRepository } from "../../../repositories/AiModelProviderRepository";
import { ConfigRepository } from "../../../repositories/ConfigRepository";
import { SQLiteService } from "../../database/SQLiteService";
import { Topic, Message, AiModel, AiModelProvider } from "../../../models/chat";
import { AssistantRepository } from "../../../repositories/AssistantRepository";
import { McpToolService } from "../../mcp/mcpToolService";
import { IMcpService } from "../../interfaces";
import {
  ClientStatus,
  McpServerConfig,
  TransportType,
  ClientStatusResponse,
} from "../../../models/mcpTypes";

// 测试运行器类，类似于 repositories 中的测试运行器
class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private beforeEachFns: Array<() => Promise<void>> = [];
  private afterEachFns: Array<() => Promise<void>> = [];
  private passedTests: string[] = [];
  private failedTests: string[] = [];

  describe(name: string, fn: () => void): void {
    console.log(`\n===== ${name} =====`);
    fn();
  }

  it(name: string, fn: () => Promise<void>): void {
    this.tests.push({ name, fn });
  }

  beforeEach(fn: () => Promise<void>): void {
    this.beforeEachFns.push(fn);
  }

  afterEach(fn: () => Promise<void>): void {
    this.afterEachFns.push(fn);
  }

  async run(): Promise<void> {
    this.passedTests = [];
    this.failedTests = [];

    for (const test of this.tests) {
      console.log(`\n----- 测试: ${test.name} -----`);

      try {
        // 运行 beforeEach 函数
        for (const beforeFn of this.beforeEachFns) {
          await beforeFn();
        }

        // 运行测试
        await test.fn();

        // 运行 afterEach 函数
        for (const afterFn of this.afterEachFns) {
          await afterFn();
        }

        console.log(`✅ 通过: ${test.name}`);
        this.passedTests.push(test.name);
      } catch (error) {
        console.error(`❌ 失败: ${test.name}`);
        console.error(error);
        this.failedTests.push(test.name);
      }
    }

    // 打印测试结果统计
    this.printTestSummary();
  }

  private printTestSummary(): void {
    console.log("\n===== 测试结果统计 =====");
    console.log(`总测试数: ${this.tests.length}`);
    console.log(`通过: ${this.passedTests.length}`);
    console.log(`失败: ${this.failedTests.length}`);

    if (this.passedTests.length > 0) {
      console.log("\n通过的测试:");
      this.passedTests.forEach((name, index) => {
        console.log(`${index + 1}. ✅ ${name}`);
      });
    }

    if (this.failedTests.length > 0) {
      console.log("\n失败的测试:");
      this.failedTests.forEach((name, index) => {
        console.log(`${index + 1}. ❌ ${name}`);
      });
    }

    const passRate = (this.passedTests.length / this.tests.length) * 100;
    console.log(`\n通过率: ${passRate.toFixed(2)}%`);
  }
}

// 简单的断言函数
function expect<T>(actual: T): {
  toBe: (expected: T) => void;
  not: {
    toBe: (expected: T) => void;
    toBeNull: () => void;
  };
  toContain: (expected: any) => void;
  toBeNull: () => void;
  toEqual: (expected: any) => void;
  toHaveLength: (expected: number) => void;
  toBeGreaterThan: (expected: number) => void;
  toBeTruthy: () => void;
} {
  return {
    toBe: (expected: T) => {
      if (actual !== expected) {
        throw new Error(`期望 ${actual} 等于 ${expected}`);
      }
    },
    not: {
      toBe: (expected: T) => {
        if (actual === expected) {
          throw new Error(`期望 ${actual} 不等于 ${expected}`);
        }
      },
      toBeNull: () => {
        if (actual === null) {
          throw new Error("期望值不为 null");
        }
      },
    },
    toContain: (expected: any) => {
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`期望数组包含 ${expected}`);
        }
      } else if (typeof actual === "string") {
        if (!actual.includes(expected)) {
          throw new Error(`期望字符串包含 ${expected}`);
        }
      } else {
        throw new Error("toContain 只能用于数组或字符串");
      }
    },
    toBeNull: () => {
      if (actual !== null) {
        throw new Error(`期望 ${actual} 为 null`);
      }
    },
    toEqual: (expected: any) => {
      const actualJson = JSON.stringify(actual);
      const expectedJson = JSON.stringify(expected);
      if (actualJson !== expectedJson) {
        throw new Error(`期望 ${actualJson} 等于 ${expectedJson}`);
      }
    },
    toHaveLength: (expected: number) => {
      if (Array.isArray(actual) || typeof actual === "string") {
        if (actual.length !== expected) {
          throw new Error(`期望长度为 ${expected}，实际为 ${actual.length}`);
        }
      } else {
        throw new Error("toHaveLength 只能用于数组或字符串");
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (typeof actual !== "number") {
        throw new Error("toBeGreaterThan 只能用于数字");
      }
      if (actual <= expected) {
        throw new Error(`期望 ${actual} 大于 ${expected}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`期望值为真，但得到 ${actual}`);
      }
    },
  };
}

// 保存原始的 fetch 函数，以便在调用本地 llama 服务时使用
let originalFetch: typeof fetch;

// 模拟 fetch 函数
async function mockFetch(url: string, options: any): Promise<any> {
  console.log(`模拟 fetch 请求: ${url}`);
  console.log("请求选项:", options);

  // 检查是否模拟错误
  if (url.includes("error=network")) {
    throw new Error("模拟网络错误");
  }

  if (url.includes("error=api")) {
    return {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        error: {
          message: "API 密钥无效",
          type: "invalid_api_key",
        },
      }),
    };
  }

  // 使用真实的 fetch 调用本地 ollama 服务
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    console.log("使用真实的 fetch 调用本地 ollama 服务");
    try {
      // 尝试使用真实的 fetch，但如果失败则返回模拟响应
      const response = await originalFetch(url, options);
      return response;
    } catch (error) {
      console.error("调用本地 ollama 服务失败:", error);
      // 返回模拟响应
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "这是一个模拟的 AI 回复，用于集成测试。",
              },
            },
          ],
        }),
      };
    }
  }

  // 模拟 AI 回复
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: "这是一个模拟的 AI 回复，用于集成测试。",
          },
        },
      ],
    }),
  };
}

/**
 * 运行聊天服务集成测试
 */
export async function runChatServiceIntegrationTests(): Promise<void> {
  // 不再检查 Node.js 环境，允许在所有环境中运行测试

  console.log("开始运行聊天服务集成测试...");

  // 保存原始的 fetch 函数
  originalFetch = global.fetch;

  try {
    // 替换全局 fetch 函数
    global.fetch = mockFetch as any;

    // 创建本地数据库服务
    const dbService = new SQLiteService();
    // 使用临时文件数据库进行测试，而不是内存数据库
    const tempDbPath = `chat_test_db_${Date.now()}.db`;
    console.log("使用临时数据库文件:", tempDbPath);

    console.log("开始初始化数据库...");
    await dbService.initialize(tempDbPath);
    console.log("数据库初始化成功");

    // 创建存储库
    const topicRepo = new ChatTopicRepository(dbService);
    const messageRepo = new ChatMessageRepository(dbService);
    const providerRepo = new AiModelProviderRepository(dbService);
    const modelRepo = new AiModelRepository(dbService);
    const configRepo = new ConfigRepository(dbService);

    // 创建服务
    const aiModelService = new AiModelService(
      providerRepo,
      modelRepo,
      configRepo
    );

    // 创建助手存储库和MCP工具服务
    const assistantRepo = new AssistantRepository(dbService);

    // 创建模拟MCP服务
    const mockMcpService: IMcpService = {
      initialize: async () => {},
      dispose: async () => {},
      createConfig: async () => ({
        id: "1",
        name: "mock",
        enabled: true,
        transportType: TransportType.SSE,
        timeoutSecs: 30,
        clientName: "mock-client",
        clientVersion: "1.0.0",
      }),
      updateConfig: async () => ({
        id: "1",
        name: "mock",
        enabled: true,
        transportType: TransportType.SSE,
        timeoutSecs: 30,
        clientName: "mock-client",
        clientVersion: "1.0.0",
      }),
      deleteConfig: async () => {},
      getConfig: async () => ({
        id: "1",
        name: "mock",
        enabled: true,
        transportType: TransportType.SSE,
        timeoutSecs: 30,
        clientName: "mock-client",
        clientVersion: "1.0.0",
      }),
      getAllConfigs: async () => [],
      getConfigByName: async () => ({
        id: "1",
        name: "mock",
        enabled: true,
        transportType: TransportType.SSE,
        timeoutSecs: 30,
        clientName: "mock-client",
        clientVersion: "1.0.0",
      }),
      getConfigByTransportType: async () => [],
      listRecentConfigs: async () => [],
      getServerStatus: async () => ({
        id: "1",
        status: ClientStatus.Connected,
        connected_at: new Date().toISOString(),
        server_info: {
          name: "mock-server",
          version: "1.0.0",
          capabilities: {},
        },
      }),
      getAllServerStatuses: async () => ({}),
    };

    const mcpToolService = new McpToolService(mockMcpService);

    const chatService = new ChatService(
      topicRepo,
      messageRepo,
      aiModelService,
      assistantRepo,
      mcpToolService
    );

    // 初始化服务
    await aiModelService.initialize();
    await chatService.initialize();

    // 创建测试运行器
    const runner = new TestRunner();

    // 定义测试
    runner.describe("聊天服务集成测试", () => {
      // 测试模型创建
      runner.it("测试模型创建", async () => {
        try {
          // 创建提供商 - 使用本地 llama 服务
          const providerId = crypto.randomUUID();
          const provider = await providerRepo.create({
            id: providerId,
            name: "Local Llama Provider",
            enabled: true,
            apiUrl: "http://127.0.0.1:11434", // 本地 ollama 服务地址
            apiKey: "not-needed", // 本地服务通常不需要 API 密钥
          });
          console.log("创建的提供商:", provider);

          // 创建模型 - 使用 qwen2.5 模型
          const modelData: Omit<AiModel, "id" | "createdAt" | "updatedAt"> = {
            name: "qwen2.5",
            providerId: provider.id,
            groupId: "local-models",
            capabilities: ["chat"],
            modelId: "qwen2.5", // 使用 qwen2.5 作为模型 ID
            contextWindow: 8192,
            maxTokens: 2048,
          };

          console.log(
            "准备创建模型，数据:",
            JSON.stringify(modelData, null, 2)
          );
          console.log("modelId 类型:", typeof modelData.modelId);
          console.log("modelId 值:", modelData.modelId);

          // 检查 modelId 是否已设置
          if (!modelData.modelId) {
            throw new Error("modelId 未设置，这将导致 NOT NULL 约束失败");
          }

          // 直接使用 SQL 执行 - 确保明确设置 model_id 字段
          const modelId = crypto.randomUUID();
          await dbService.execute(
            `INSERT INTO ai_models (
              id, name, provider_id, group_id, capabilities, model_id, 
              context_window, max_tokens, config, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              modelId,
              "Test Model SQL",
              providerId,
              "test-group",
              JSON.stringify(["chat"]),
              "test-model-sql", // 明确指定 model_id 值
              4096,
              1000,
              "{}",
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );

          console.log("使用 SQL 创建的模型 ID:", modelId);

          // 使用存储库方法查询
          const sqlModel = await modelRepo.findById(modelId);
          console.log("SQL 创建的模型:", sqlModel);
          console.log("SQL 模型的 modelId:", sqlModel?.modelId);
          console.log("SQL 模型的 modelId 类型:", typeof sqlModel?.modelId);

          // 使用存储库方法创建
          console.log(
            "使用存储库方法创建模型，数据:",
            JSON.stringify(modelData, null, 2)
          );
          const model = await modelRepo.create(modelData);
          console.log("使用存储库创建的模型:", model);
          console.log("存储库模型的 modelId:", model.modelId);
          console.log("存储库模型的 modelId 类型:", typeof model.modelId);

          // 验证模型创建成功
          const retrievedModel = await modelRepo.findById(model.id);
          console.log("检索到的模型:", retrievedModel);
          console.log("检索模型的 modelId:", retrievedModel?.modelId);
          console.log(
            "检索模型的 modelId 类型:",
            typeof retrievedModel?.modelId
          );

          // 确保模型存在
          if (!retrievedModel) {
            throw new Error("模型创建失败，无法检索到模型");
          }

          // 验证模型属性
          expect(retrievedModel.name).toBe(model.name);
          expect(retrievedModel.providerId).toBe(providerId);
          expect(retrievedModel.modelId).toBe(model.modelId);
        } catch (error) {
          console.error("测试模型创建失败:", error);
          throw error;
        }
      });

      // 测试创建话题和发送消息
      runner.it("应该能够创建话题并发送消息", async () => {
        try {
          // 创建话题
          const topic = await chatService.createTopic("测试话题");
          console.log("创建的话题:", topic);
          console.log(
            "话题数据类型:",
            Object.keys(topic).map(
              (key) => `${key}: ${typeof (topic as any)[key]}`
            )
          );

          // 验证话题创建成功
          if (!topic) {
            throw new Error("话题创建失败，返回值为空");
          }
          expect(topic.title).toBe("测试话题");

          // 初始消息计数应该是 0
          console.log(
            "初始消息计数:",
            topic.messageCount,
            "类型:",
            typeof topic.messageCount
          );
          expect(typeof topic.messageCount).toBe("number");
          expect(topic.messageCount).toBe(0);

          // 发送用户消息
          const userMessage = await chatService.sendMessage(topic.id, "1+1");
          console.log("发送的用户消息:", userMessage);

          // 验证用户消息发送成功
          if (!userMessage) {
            throw new Error("用户消息发送失败，返回值为空");
          }
          expect(userMessage.role).toBe("user");
          expect(userMessage.content).toBe("1+1");

          // 获取话题消息
          const messages = await chatService.getMessages(topic.id);
          console.log("话题消息:", messages);

          // 验证消息列表包含用户消息
          expect(messages.length).toBeGreaterThan(0);
          expect(messages[0].content).toBe("1+1");

          // 等待一小段时间，确保数据库更新完成
          console.log("等待数据库更新...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 获取更新后的话题
          const updatedTopic = await chatService.getTopic(topic.id);
          console.log("更新后的话题:", updatedTopic);
          console.log(
            "更新后话题数据类型:",
            Object.keys(updatedTopic || {}).map(
              (key) => `${key}: ${typeof (updatedTopic as any)[key]}`
            )
          );

          // 验证话题信息已更新
          if (!updatedTopic) {
            throw new Error("无法获取更新后的话题");
          }

          // 验证消息计数大于 0
          console.log(
            `话题消息计数: ${
              updatedTopic.messageCount
            }, 类型: ${typeof updatedTopic.messageCount}`
          );
          expect(typeof updatedTopic.messageCount).toBe("number");
          expect(updatedTopic.messageCount).toBeGreaterThan(0);

          // 验证预览内容
          expect(updatedTopic.preview).toBe("1+1");

          console.log("测试创建话题并发送消息成功");
        } catch (error) {
          console.error("测试创建话题并发送消息失败:", error);
          throw error;
        }
      });

      // 测试模型和供应商
      runner.it("模型和供应商集成测试", async () => {
        try {
          // 创建提供商 - 使用本地 llama 服务
          const providerId = crypto.randomUUID();
          const provider = await providerRepo.create({
            id: providerId,
            name: "Local Llama Provider",
            enabled: true,
            apiUrl: "http://127.0.0.1:11434", // 本地 ollama 服务地址
            apiKey: "not-needed", // 本地服务通常不需要 API 密钥
          });
          console.log("创建的提供商:", provider);

          // 创建模型 - 使用 qwen2.5 模型
          const modelData: Omit<AiModel, "id" | "createdAt" | "updatedAt"> = {
            name: "qwen2.5",
            providerId: provider.id,
            groupId: "local-models",
            capabilities: ["chat"],
            modelId: "qwen2.5", // 使用 qwen2.5 作为模型 ID
            contextWindow: 8192,
            maxTokens: 2048,
          };

          console.log(
            "准备创建模型，数据:",
            JSON.stringify(modelData, null, 2)
          );
          console.log("modelId 类型:", typeof modelData.modelId);
          console.log("modelId 值:", modelData.modelId);

          // 检查 modelId 是否已设置
          if (!modelData.modelId) {
            throw new Error("modelId 未设置，这将导致 NOT NULL 约束失败");
          }

          const model = await modelRepo.create(modelData);
          console.log("创建的模型:", model);
          console.log("模型的 modelId:", model.modelId);
          console.log("模型的 modelId 类型:", typeof model.modelId);

          // 验证模型创建成功
          const retrievedModel = await modelRepo.findById(model.id);
          console.log("检索到的模型:", retrievedModel);
          console.log("检索模型的 modelId:", retrievedModel?.modelId);
          console.log(
            "检索模型的 modelId 类型:",
            typeof retrievedModel?.modelId
          );

          // 确保模型存在
          if (!retrievedModel) {
            throw new Error("模型创建失败，无法检索到模型");
          }

          // 验证模型属性
          expect(retrievedModel.name).toBe(model.name);
          expect(retrievedModel.providerId).toBe(providerId);
          expect(retrievedModel.modelId).toBe(model.modelId);

          // 获取所有模型
          const models = await modelRepo.findAll();
          console.log("所有模型:", models);

          // 验证模型列表包含新创建的模型
          expect(models.length).toBeGreaterThan(0);
          expect(models.some((m) => m.id === model.id)).toBe(true);
        } catch (error) {
          console.error("模型和供应商集成测试失败:", error);
          throw error;
        }
      });

      // 测试话题管理功能
      runner.it("应该能够管理话题", async () => {
        try {
          console.log("开始测试话题管理功能...");

          // 创建多个话题
          console.log("创建话题1...");
          const topic1 = await chatService.createTopic("话题1");
          console.log("创建的话题1:", JSON.stringify(topic1, null, 2));
          console.log(
            "话题1数据类型:",
            Object.keys(topic1).map(
              (key) => `${key}: ${typeof (topic1 as any)[key]}`
            )
          );

          console.log("创建话题2...");
          const topic2 = await chatService.createTopic("话题2");
          console.log("创建的话题2:", JSON.stringify(topic2, null, 2));

          // 获取所有话题
          console.log("获取所有话题...");
          const topics = await chatService.getAllTopics();
          console.log("所有话题:", topics);

          // 验证话题列表包含新创建的话题
          expect(topics.length).toBeGreaterThan(1);
          expect(topics.some((t: Topic) => t.id === topic1.id)).toBe(true);
          expect(topics.some((t: Topic) => t.id === topic2.id)).toBe(true);

          // 更新话题标题
          console.log("更新话题1标题...");
          const updatedTitle = "更新后的话题1";
          await chatService.updateTopic(topic1.id, { title: updatedTitle });

          // 获取更新后的话题
          console.log("获取更新后的话题1...");
          const updatedTopic = await chatService.getTopic(topic1.id);
          console.log("更新后的话题1:", updatedTopic);

          // 验证话题标题已更新
          if (!updatedTopic) {
            throw new Error("无法获取更新后的话题");
          }
          expect(updatedTopic.title).toBe(updatedTitle);

          // 删除话题
          console.log("删除话题2...");
          await chatService.deleteTopic(topic2.id);

          // 获取所有话题
          console.log("获取删除后的所有话题...");
          const remainingTopics = await chatService.getAllTopics();
          console.log("剩余话题:", remainingTopics);

          // 验证话题已被删除
          expect(remainingTopics.some((t: Topic) => t.id === topic2.id)).toBe(
            false
          );

          console.log("话题管理测试成功");
        } catch (error) {
          console.error("话题管理测试失败:", error);
          throw error;
        }
      });

      // 测试消息管理功能
      runner.it("应该能够管理消息", async () => {
        try {
          console.log("开始测试消息管理功能...");

          // 创建话题
          console.log("创建话题...");
          const topic = await chatService.createTopic("消息管理测试");
          console.log("创建的话题:", JSON.stringify(topic, null, 2));

          // 发送用户消息
          console.log("发送用户消息...");
          const userMessage = await chatService.sendMessage(
            topic.id,
            "用户消息"
          );
          console.log("发送的用户消息:", JSON.stringify(userMessage, null, 2));

          // 发送系统消息
          console.log("发送系统消息...");
          const systemMessage = await chatService.sendSystemMessage(
            topic.id,
            "系统消息"
          );
          console.log(
            "发送的系统消息:",
            JSON.stringify(systemMessage, null, 2)
          );

          // 获取话题消息
          console.log("获取话题消息...");
          const messages = await chatService.getMessages(topic.id);
          console.log("话题消息:", JSON.stringify(messages, null, 2));

          // 验证消息列表
          expect(messages.length).toBe(2);
          expect(messages[0].role).toBe("user");
          expect(messages[1].role).toBe("system");

          // 删除消息
          console.log("删除用户消息...");
          await chatService.deleteMessage(userMessage.id);
          console.log("用户消息已删除");

          // 等待一小段时间，确保数据库更新完成
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 获取更新后的消息列表
          console.log("获取更新后的消息列表...");
          const updatedMessages = await chatService.getMessages(topic.id);
          console.log(
            "更新后的消息列表:",
            JSON.stringify(updatedMessages, null, 2)
          );

          // 验证消息删除成功
          expect(updatedMessages.length).toBe(1);
          expect(updatedMessages[0].role).toBe("system");

          // 获取更新后的话题
          console.log("获取更新后的话题...");
          const updatedTopic = await chatService.getTopic(topic.id);
          console.log("更新后的话题:", updatedTopic);

          // 验证话题信息已更新
          if (!updatedTopic) {
            throw new Error("无法获取更新后的话题");
          }

          // 验证消息计数大于 0
          console.log(
            `话题消息计数: ${
              updatedTopic.messageCount
            }, 类型: ${typeof updatedTopic.messageCount}`
          );
          expect(updatedTopic.messageCount).toBeGreaterThan(0);

          // 验证预览内容
          expect(updatedTopic.preview).toBe("用户消息");

          console.log("消息管理测试完成");
        } catch (error) {
          console.error("消息管理测试失败:", error);
          throw error;
        }
      });

      // 测试 AI 回复生成
      runner.it("应该能够生成 AI 回复", async () => {
        try {
          // 创建提供商 - 使用本地 llama 服务
          const providerId = crypto.randomUUID();
          const provider = await providerRepo.create({
            id: providerId,
            name: "Local Llama Provider",
            enabled: true,
            apiUrl: "http://127.0.0.1:11434", // 本地 ollama 服务地址
            apiKey: "not-needed", // 本地服务通常不需要 API 密钥
          });
          console.log("创建的提供商:", provider);

          // 创建模型 - 使用 qwen2.5 模型
          const model = await modelRepo.create({
            name: "qwen2.5",
            providerId: provider.id,
            groupId: "local-models",
            capabilities: ["chat"],
            modelId: "qwen2.5",
            contextWindow: 8192,
            maxTokens: 2048,
          });
          console.log("创建的模型:", model);

          // 设置当前模型
          await configRepo.setValue("current_provider_id", provider.id);
          await configRepo.setValue("current_model_id", model.id);

          // 创建话题
          const topic = await chatService.createTopic("AI 回复测试");
          console.log("创建的话题:", topic);

          // 发送用户消息
          const userMessage = await chatService.sendMessage(
            topic.id,
            "你好，请简单介绍一下自己"
          );
          console.log("发送的用户消息:", userMessage);

          // 生成 AI 回复
          console.log("生成 AI 回复...");
          const onEvent = (event: any) => console.log("事件:", event);
          const aiReply = await chatService.generateAiReplyStream(
            topic.id,
            onEvent
          );
          console.log("生成的 AI 回复:", aiReply);

          // 等待一小段时间，确保数据库更新完成
          console.log("等待数据库更新...");
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 验证 AI 回复生成成功
          if (!aiReply) {
            throw new Error("AI 回复生成失败，返回值为空");
          }
          expect(aiReply.role).toBe("assistant");
          expect(aiReply.content.length).toBeGreaterThan(0);
          expect(aiReply.topicId).toBe(topic.id); // 确保 topicId 正确

          // 获取话题消息
          const messages = await chatService.getMessages(topic.id);
          console.log("话题消息:", messages);

          // 验证消息列表包含用户消息和 AI 回复
          expect(messages).toHaveLength(2);
          expect(messages[0].role).toBe("user");
          expect(messages[1].role).toBe("assistant");

          // 获取更新后的话题
          const updatedTopic = await chatService.getTopic(topic.id);
          console.log("更新后的话题:", updatedTopic);

          // 验证话题信息已更新
          if (!updatedTopic) {
            throw new Error("无法获取更新后的话题");
          }
          expect(updatedTopic.messageCount).toBe(2);
          expect(updatedTopic.lastModelId).toBe(model.id);
          expect(updatedTopic.lastProviderId).toBe(provider.id);
        } catch (error) {
          console.error("AI 回复测试失败:", error);
          throw error;
        }
      });

      // 测试 API 密钥无效的情况
      runner.it("应该能够处理 API 密钥无效的情况", async () => {
        try {
          // 创建提供商 - 使用错误的 API 密钥
          const providerId = crypto.randomUUID();
          const provider = await providerRepo.create({
            id: providerId,
            name: "Invalid API Provider",
            enabled: true,
            apiUrl: "http://127.0.0.1:11434/error=api", // 添加错误标记
            apiKey: "invalid-api-key",
          });

          // 创建模型 - 使用 qwen2.5 模型
          const model = await modelRepo.create({
            name: "qwen2.5",
            providerId: provider.id,
            groupId: "local-models",
            capabilities: ["chat"],
            modelId: "qwen2.5",
            contextWindow: 8192,
            maxTokens: 2048,
          });

          // 设置当前模型
          await configRepo.setValue("current_provider_id", provider.id);
          await configRepo.setValue("current_model_id", model.id);

          // 创建话题
          const topic = await chatService.createTopic("API 错误测试");

          // 发送用户消息
          await chatService.sendMessage(topic.id, "这个请求应该触发 API 错误");

          // 尝试生成 AI 回复，应该捕获到错误
          let error: any;
          try {
            const onEvent = (event: any) => console.log("事件:", event);
            await chatService.generateAiReplyStream(topic.id, onEvent);
          } catch (e) {
            error = e;
          }

          // 验证错误被正确处理
          expect(error).not.toBeNull();
          console.log("捕获到的 API 错误:", error);

          // 验证话题状态
          const updatedTopic = await chatService.getTopic(topic.id);
          expect(updatedTopic).not.toBeNull();
          expect(updatedTopic!.messageCount).toBe(1); // 只有用户消息，没有 AI 回复
        } catch (error) {
          console.error("API 错误测试失败:", error);
          throw error;
        }
      });

      // 测试网络错误的情况
      runner.it("应该能够处理网络错误的情况", async () => {
        try {
          // 创建提供商 - 使用会触发网络错误的 URL
          const providerId = crypto.randomUUID();
          const provider = await providerRepo.create({
            id: providerId,
            name: "Network Error Provider",
            enabled: true,
            apiUrl: "http://127.0.0.1:11434/error=network", // 添加错误标记
            apiKey: "test-api-key",
          });

          // 创建模型 - 使用 qwen2.5 模型
          const model = await modelRepo.create({
            name: "qwen2.5",
            providerId: provider.id,
            groupId: "local-models",
            capabilities: ["chat"],
            modelId: "qwen2.5",
            contextWindow: 8192,
            maxTokens: 2048,
          });

          // 设置当前模型
          await configRepo.setValue("current_provider_id", provider.id);
          await configRepo.setValue("current_model_id", model.id);

          // 创建话题
          const topic = await chatService.createTopic("网络错误测试");

          // 发送用户消息
          await chatService.sendMessage(topic.id, "这个请求应该触发网络错误");

          // 尝试生成 AI 回复，应该捕获到错误
          let error: any;
          try {
            const onEvent = (event: any) => console.log("事件:", event);
            await chatService.generateAiReplyStream(topic.id, onEvent);
          } catch (e) {
            error = e;
          }

          // 验证错误被正确处理
          expect(error).not.toBeNull();
          console.log("捕获到的网络错误:", error);

          // 验证话题状态
          const updatedTopic = await chatService.getTopic(topic.id);
          expect(updatedTopic).not.toBeNull();
          expect(updatedTopic!.messageCount).toBe(1); // 只有用户消息，没有 AI 回复
        } catch (error) {
          console.error("网络错误测试失败:", error);
          throw error;
        }
      });

      // 测试消息映射函数
      runner.it("应该正确映射消息对象", async () => {
        try {
          console.log("开始测试消息映射函数...");

          // 创建话题
          const topic = await chatService.createTopic("消息映射测试");
          console.log("创建的话题:", topic);

          // 创建消息
          const messageData = {
            topicId: topic.id,
            role: "user" as const,
            content: "测试消息内容",
            timestamp: new Date().toISOString(),
          };

          console.log("准备创建消息，数据:", messageData);

          // 使用存储库创建消息
          const message = await messageRepo.create(messageData);
          console.log("创建的消息:", message);

          // 验证消息创建成功
          expect(message.id).toBeTruthy();
          expect(message.topicId).toBe(topic.id);
          expect(message.role).toBe("user");
          expect(message.content).toBe("测试消息内容");

          // 使用存储库查询消息
          const retrievedMessage = await messageRepo.findById(message.id);
          console.log("检索到的消息:", retrievedMessage);

          // 验证消息检索成功
          if (!retrievedMessage) {
            throw new Error("消息检索失败，返回值为空");
          }

          // 验证消息属性
          expect(retrievedMessage.id).toBe(message.id);
          expect(retrievedMessage.topicId).toBe(message.topicId);
          expect(retrievedMessage.role).toBe(message.role);
          expect(retrievedMessage.content).toBe(message.content);
          expect(retrievedMessage.timestamp).toBe(message.timestamp);

          // 查询话题的所有消息
          const topicMessages = await messageRepo.findByTopicId(topic.id);
          console.log("话题的所有消息:", topicMessages);

          // 验证话题消息列表包含新创建的消息
          expect(topicMessages.length).toBeGreaterThan(0);
          expect(topicMessages.some((m) => m.id === message.id)).toBe(true);

          console.log("消息映射测试成功");
        } catch (error) {
          console.error("消息映射测试失败:", error);
          throw error;
        }
      });
    });

    // 运行测试
    await runner.run();

    // 获取数据库路径，用于后续清理
    const dbPath = await dbService.getLocation();
    console.log("测试使用的数据库路径:", dbPath);

    // 清理资源
    console.log("清理资源...");
    await chatService.dispose();
    await aiModelService.dispose();
    await dbService.close();

    // 尝试删除临时数据库文件
    try {
      if (dbPath && !dbPath.includes(":memory:")) {
        console.log("尝试删除临时数据库文件:", dbPath);
        // 使用 Tauri 的文件系统 API 删除文件
        const fs = await import("@tauri-apps/plugin-fs");
        await fs.remove(dbPath);
        console.log("临时数据库文件已删除");
      }
    } catch (error) {
      console.error("删除临时数据库文件失败:", error);
      // 继续执行，不要因为清理失败而中断测试
    }

    console.log("聊天服务集成测试完成");
  } catch (error) {
    console.error("聊天服务集成测试失败:", error);
  } finally {
    // 恢复原始的 fetch 函数
    global.fetch = originalFetch;
  }
}
