// 添加到repositories.integration.test.ts

import { AiModelRepository } from "../AiModelRepository";
import { AiModelProviderRepository } from "../AiModelProviderRepository";
import { SQLiteService } from "../../services/database/SQLiteService";
import { createTables, dropTables } from "../../services/database/schema";
import { ChatTopicRepository } from "../ChatTopicRepository";
import { ChatMessageRepository } from "../ChatMessageRepository";

describe("Repositories Integration Tests", () => {
  let db: SQLiteService;
  let topicRepo: ChatTopicRepository;
  let messageRepo: ChatMessageRepository;
  let providerRepo: AiModelProviderRepository;
  let modelRepo: AiModelRepository;

  beforeAll(async () => {
    // 使用内存数据库进行测试
    db = new SQLiteService();
    await db.initialize(":memory:");
    await createTables(db);

    // 初始化存储库实例
    topicRepo = new ChatTopicRepository(db);
    messageRepo = new ChatMessageRepository(db);
    providerRepo = new AiModelProviderRepository(db);
    modelRepo = new AiModelRepository(db);
  });

  // 测试提供商和模型之间的关系
  it("should handle provider and models together", async () => {
    // 创建提供商
    const provider = await providerRepo.create({
      id: crypto.randomUUID(),
      name: "AI Provider",
      enabled: true,
      apiUrl: "https://api.example.com",
    });

    // 添加模型
    await modelRepo.create({
      name: "Model A",
      providerId: provider.id,
      groupId: "group-1",
      capabilities: ["text"],
      modelId: "model-a",
      contextWindow: 4096,
      maxTokens: 1000,
    });

    await modelRepo.create({
      name: "Model B",
      providerId: provider.id,
      groupId: "group-1",
      capabilities: ["image"],
      modelId: "model-b",
      contextWindow: 4096,
      maxTokens: 1000,
    });

    // 查询提供商的所有模型
    const models = await modelRepo.findByProviderId(provider.id);
    expect(models.length).toBe(2);

    // 禁用提供商
    await providerRepo.update(provider.id, { enabled: false });

    // 验证提供商已禁用
    const updatedProvider = await providerRepo.findById(provider.id);
    expect(updatedProvider?.enabled).toBe(false);

    // 验证启用的提供商列表不包含该提供商
    const enabledProviders = await providerRepo.findEnabled();
    expect(enabledProviders.length).toBe(0);
  });

  // 测试话题和消息之间的关系
  it("should handle topic and messages together", async () => {
    // 创建话题
    const topic = await topicRepo.create({
      title: "Conversation Topic",
      messageCount: 0,
    });

    // 添加消息
    await messageRepo.create({
      topicId: topic.id,
      role: "user",
      content: "Hello",
      timestamp: new Date().toISOString(),
    });

    // 增加消息计数
    await topicRepo.incrementMessageCount(topic.id);
    const updatedTopic = await topicRepo.findById(topic.id);
    expect(updatedTopic?.messageCount).toBe(1);

    // 添加第二条消息
    const message = await messageRepo.create({
      topicId: topic.id,
      role: "assistant",
      content: "Hi there!",
      timestamp: new Date().toISOString(),
    });

    // 再次增加消息计数
    await topicRepo.incrementMessageCount(topic.id);
    const finalTopic = await topicRepo.findById(topic.id);
    expect(finalTopic?.messageCount).toBe(2);

    // 更新话题预览
    await topicRepo.updatePreview(topic.id, message.content);

    // 验证预览更新
    const retrievedTopic = await topicRepo.findById(topic.id);
    expect(retrievedTopic?.preview).toBe("Hi there!");

    // 查询话题的所有消息
    const messages = await messageRepo.findByTopicId(topic.id);
    expect(messages.length).toBe(2);
  });
});
