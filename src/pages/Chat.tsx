import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ListItem,
  ListItemText,
  Chip,
  ListItemButton,
} from "@mui/material";
import { SERVICE_KEYS } from "../services/constants";
import AssistantPanel from "../components/chat/assistant/AssistantPanel";
import ChatContent from "../components/chat/content/ChatContent";
import {
  Message as ChatModelMessage,
  Topic,
  AiModel,
  AiModelProvider,
} from "../models/chat";

import { IChatService } from "../services/interfaces";
import { IAiModelService } from "../services/interfaces";
import { ServiceContainer } from "../services/ServiceContainer";
import {
  StreamEvent,
  StreamEventType,
} from "../services/chat/StreamEventHandler";

const Chat = () => {
  // 1. 所有的 useState 放在最前面
  const [selectedAssistant, setSelectedAssistant] = useState<{
    provider: AiModelProvider;
    model: AiModel;
  } | null>(null);
  const [messages, setMessages] = useState<ChatModelMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(
    undefined
  );
  const [services, setServices] = useState<{
    chatService?: IChatService;
    aiModelService?: IAiModelService;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [assistants, setAssistants] = useState<any[]>([]);
  const [chatContentRef, setChatContentRef] = useState<{
    handleStreamEvent?: (event: StreamEvent) => void;
  } | null>(null);

  // 2. 使用一个 useEffect 初始化所有服务
  useEffect(() => {
    const initializeServices = async () => {
      try {
        const serviceContainer = ServiceContainer.getInstance();
        const chatService = serviceContainer.get<IChatService>(
          SERVICE_KEYS.CHAT
        );
        const aiModelService = serviceContainer.get<IAiModelService>(
          SERVICE_KEYS.AI_MODEL
        );

        setServices({
          chatService,
          aiModelService,
        });

        // 获取当前选择的模型
        if (aiModelService) {
          const currentModel = await aiModelService.getCurrentModel();
          if (currentModel) {
            setSelectedAssistant(currentModel);
          }
        }
      } catch (error) {
        console.error("服务初始化失败:", error);
        setError(error instanceof Error ? error.message : "服务初始化失败");
      }
    };

    initializeServices();
  }, []);

  // 3. 处理函数定义
  const handleSelectAssistant = useCallback(
    async (assistant: { provider: AiModelProvider; model: AiModel }) => {
      try {
        const aiModelService = services.aiModelService;
        if (!aiModelService) return;

        await aiModelService.setCurrentModel(assistant.model);

        setSelectedAssistant(assistant);

        const chatService = services.chatService;
        if (selectedTopicId && chatService) {
          // 获取当前话题
          const topic = await chatService.getTopic(selectedTopicId);
          if (topic) {
            // 准备更新数据
            const updateData: Partial<Topic> = {
              lastModelId: assistant.model.id,
              lastProviderId: assistant.provider.id,
            };

            // 如果话题有 currentConfig，更新它
            if (topic.currentConfig) {
              updateData.currentConfig = {
                ...topic.currentConfig,
                modelId: assistant.model.id,
                providerId: assistant.provider.id,
              };
            } else {
              // 如果话题没有 currentConfig，创建一个新的
              updateData.currentConfig = {
                modelId: assistant.model.id,
                providerId: assistant.provider.id,
              };
            }

            console.log(`更新话题 ${selectedTopicId} 的模型配置:`, updateData);

            // 更新话题
            await chatService.updateTopic(selectedTopicId, updateData);
          }
        }
      } catch (error) {
        console.error("设置当前模型失败:", error);
        setError("设置模型失败");
      }
    },
    [services, selectedTopicId]
  );

  const handleSelectTopic = useCallback(
    async (topic: Topic) => {
      const { chatService, aiModelService } = services;
      if (!chatService || !aiModelService) return;

      try {
        setIsLoading(true);
        setSelectedTopicId(topic.id);

        // 获取话题消息并转换为 ChatModelMessage 类型
        const topicMessages = (await chatService.getMessages(topic.id)) || [];
        const convertedMessages: ChatModelMessage[] = topicMessages.map(
          (msg) => ({
            ...msg,
            topicId: topic.id, // 确保每条消息都有 topicId
          })
        );
        setMessages(convertedMessages);

        if (topic.lastModelId && topic.lastProviderId) {
          const provider = await aiModelService.getProvider(
            topic.lastProviderId
          );
          if (provider) {
            const model = await aiModelService.getModel(topic.lastModelId);
            if (model) {
              setSelectedAssistant({ provider, model });
              await aiModelService.setCurrentModel(model);
            }
          }
        }
      } catch (error) {
        console.error("加载话题失败:", error);
        setError("加载话题失败");
      } finally {
        setIsLoading(false);
      }
    },
    [services]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!services.chatService) {
        console.error("无法发送消息：服务未初始化");
        return;
      }

      try {
        console.log("开始发送消息:", content);
        setIsLoading(true);
        let currentTopicId = selectedTopicId;

        // 如果没有选择话题，创建一个新话题
        if (!currentTopicId) {
          console.log("没有选择话题，创建新话题");
          // 创建新话题
          const newTopic = await services.chatService?.createTopic(
            content.length > 20 ? content.substring(0, 20) + "..." : content
          );

          // 设置当前话题ID
          if (newTopic) {
            currentTopicId = newTopic.id;
            setSelectedTopicId(newTopic.id);
            console.log(`已创建新话题: ${newTopic.title}, ID: ${newTopic.id}`);
          } else {
            throw new Error("创建话题失败");
          }
        } else {
          console.log(`使用现有话题: ID=${currentTopicId}`);
        }

        // 如果没有选择助手，使用默认助手
        let currentAssistant = selectedAssistant;
        if (!currentAssistant && services.aiModelService) {
          console.log("没有选择助手，获取默认助手");
          const defaultModel = await services.aiModelService.getDefaultModel();
          if (defaultModel) {
            currentAssistant = defaultModel;
            setSelectedAssistant(defaultModel);
            console.log(
              `已选择默认助手: ${defaultModel.model.name}, 提供商: ${defaultModel.provider.name}`
            );
          } else {
            throw new Error("获取默认助手失败");
          }
        } else if (currentAssistant) {
          console.log(
            `使用当前选择的助手: ${currentAssistant.model.name}, 提供商: ${currentAssistant.provider.name}`
          );
        }

        if (!currentAssistant || !currentTopicId) {
          throw new Error("无法发送消息：未能获取助手或话题");
        }

        // 发送用户消息
        console.log(`发送用户消息到话题: ${currentTopicId}`);
        const userMessage = await services.chatService.sendMessage(
          currentTopicId,
          content
        );
        console.log(`用户消息已发送: ${userMessage.id}`);

        // 转换为 ChatModelMessage 类型
        const userModelMessage: ChatModelMessage = {
          ...userMessage,
          topicId: currentTopicId,
        };
        setMessages((prev) => [...prev, userModelMessage]);

        // 生成AI回复
        if (!services?.chatService) {
          console.error("Chat service is not initialized");
          setError("聊天服务未初始化");
          return;
        }

        try {
          // 创建初始的助手消息
          const assistantMessageId = `msg-${Date.now()}`;
          const initialAssistantMessage: ChatModelMessage = {
            id: assistantMessageId,
            topicId: currentTopicId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
            modelId: currentAssistant.model.id,
            providerId: currentAssistant.provider.id,
          };

          // 添加初始消息到列表
          setMessages((prev) => [...prev, initialAssistantMessage]);

          // 生成AI回复
          const response = await services.chatService.generateAiReplyStream(
            currentTopicId,
            (event: StreamEvent) => {
              // 确保使用相同的messageId
              const eventWithCorrectId = {
                ...event,
                messageId: assistantMessageId,
              };

              // 1. 转发事件到ChatContent
              chatContentRef?.handleStreamEvent?.(eventWithCorrectId);

              // 这里取消掉，好像也没什么影响
              // 2. 更新消息内容（仅对TEXT事件）
              // if (event.type === StreamEventType.TEXT && "content" in event) {
              //   setMessages((prev) => {
              //     const newMessages = [...prev];
              //     const messageIndex = newMessages.findIndex(
              //       (msg) => msg.id === assistantMessageId
              //     );
              //     if (messageIndex !== -1) {
              //       const updatedMessage = { ...newMessages[messageIndex] };
              //       updatedMessage.content =
              //         (updatedMessage.content || "") + event.content;
              //       newMessages[messageIndex] = updatedMessage;
              //     }
              //     return newMessages;
              //   });
              // }
            },
            currentAssistant.model.id,
            currentAssistant.provider.id
          );

          // // 更新最终消息
          // setMessages((prev) => {
          //   const newMessages = [...prev];
          //   const messageIndex = newMessages.findIndex(
          //     (msg) => msg.id === assistantMessageId
          //   );
          //   if (messageIndex !== -1) {
          //     newMessages[messageIndex] = {
          //       ...response,
          //       id: assistantMessageId,
          //       topicId: currentTopicId,
          //     };
          //   }
          //   return newMessages;
          // });
        } catch (error) {
          console.error("生成AI回复失败:", error);
          setError("生成回复失败");
        }
      } catch (error) {
        console.error("发送消息失败:", error);
        setError("发送消息失败");
      } finally {
        setIsLoading(false);
      }
    },
    [services, selectedAssistant, selectedTopicId, chatContentRef, messages]
  );

  // 处理MCP工具调用
  const handleMcpToolCall = useCallback(
    async (configId: string, toolName: string, params: Record<string, any>) => {
      try {
        console.log(
          `处理MCP工具调用: ${toolName}, 配置ID: ${configId}, 参数:`,
          params
        );

        // 这里可以添加工具调用的处理逻辑
        // 例如：记录工具调用、将结果添加到聊天历史等
        console.log(
          `调用MCP工具: ${toolName}, 配置ID: ${configId}, 参数:`,
          params
        );

        // 如果需要，可以将工具调用结果添加到聊天历史
        // 这里只是一个简单的示例，实际实现可能需要更复杂的逻辑
        const result = { success: true, message: `工具 ${toolName} 调用成功` };
        console.log(`MCP工具调用结果:`, result);
        return result;
      } catch (error) {
        console.error(`调用MCP工具失败: ${toolName}`, error);
        throw error;
      }
    },
    []
  );

  const renderAssistantList = () => {
    return assistants.map((assistant) => {
      const isSelected = !!(
        selectedAssistant &&
        selectedAssistant.provider === assistant.providerId &&
        selectedAssistant.model === assistant.modelId
      );

      return (
        <ListItem key={assistant.id} disablePadding>
          <ListItemButton
            selected={isSelected}
            onClick={() => handleSelectAssistant(assistant)}
          >
            <ListItemText primary={assistant.name} />
            {isSelected && <Chip label="当前选择" color="primary" />}
          </ListItemButton>
        </ListItem>
      );
    });
  };

  // 4. 错误状态处理
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  // 5. 加载状态处理
  if (!services.chatService || !services.aiModelService) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  // 6. 渲染主要内容
  return (
    <Box
      sx={{
        display: "flex",
        height: "100%",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <AssistantPanel
        onSelectAssistant={handleSelectAssistant}
        selectedAssistant={selectedAssistant}
        onSelectTopic={handleSelectTopic}
        selectedTopicId={selectedTopicId}
      />
      <ChatContent
        ref={setChatContentRef}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedAssistant={selectedAssistant}
        onMcpToolCall={handleMcpToolCall}
        currentTopicId={selectedTopicId}
      />
    </Box>
  );
};

export default Chat;
