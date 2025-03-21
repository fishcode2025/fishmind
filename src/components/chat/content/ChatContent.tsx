import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Box } from "@mui/material";
import { Message, AiModel, AiModelProvider } from "../../../models/chat";
import MessageList, { MessageListRef } from "./MessageList";
import { StreamEvent } from "../../../services/chat/StreamEventHandler";
import MessageInput from "../input/MessageInput";

export interface ChatContentRef {
  handleStreamEvent: (event: StreamEvent) => void;
}

interface ChatContentProps {
  messages: Message[];
  onSendMessage?: (message: string) => void;
  isLoading?: boolean;
  selectedAssistant?: { provider: AiModelProvider; model: AiModel } | null;
  onMcpToolCall?: (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ) => Promise<any>;
  currentTopicId?: string;
}

type MessageType = "user" | "ai" | "error" | "system";

interface FormattedMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: string;
  error?: any;
  modelId?: string;
  providerId?: string;
}

const ChatContent = forwardRef<ChatContentRef, ChatContentProps>(
  (
    {
      messages,
      onSendMessage,
      isLoading,
      selectedAssistant,
      onMcpToolCall,
      currentTopicId,
    },
    ref
  ) => {
    const messageListRef = useRef<MessageListRef>(null);

    // 暴露handleStreamEvent方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        handleStreamEvent: (event: StreamEvent) => {
          console.log("ChatContent received event:", event);
          // 转发事件到MessageList
          messageListRef.current?.handleStreamEvent?.(event);
        },
      }),
      []
    );

    // 格式化消息
    const formattedMessages: FormattedMessage[] = messages.map((message) => {
      if (message.role === "user") {
        return {
          id: message.id,
          type: "user",
          content: message.content,
          timestamp: message.timestamp,
          modelId: message.modelId,
          providerId: message.providerId,
        };
      } else if (message.role === "assistant") {
        return {
          id: message.id,
          type: "ai",
          content: message.content,
          timestamp: message.timestamp,
          modelId: message.modelId,
          providerId: message.providerId,
        };
      } else if (message.role === "system") {
        return {
          id: message.id,
          type: "system",
          content: message.content,
          timestamp: message.timestamp,
        };
      }
      else {
        return {
          id: message.id,
          type: "error",
          content: message.content,
          timestamp: message.timestamp,
          modelId: message.modelId,
          providerId: message.providerId,
        };
      }
    });

    console.log("Rendering messages:", formattedMessages);

    return (
      <Box
        sx={{
          flexGrow: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <MessageList ref={messageListRef} messages={formattedMessages} />
        </Box>
        <MessageInput
          onSendMessage={onSendMessage}
          disabled={isLoading}
          selectedAssistant={selectedAssistant}
          onMcpToolCall={onMcpToolCall}
          currentTopicId={currentTopicId}
        />
      </Box>
    );
  }
);

ChatContent.displayName = "ChatContent";

export default ChatContent;
