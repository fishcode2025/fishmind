import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { Box, useTheme } from "@mui/material";
import UserMessage from "./UserMessage";
import AIMessage from "./AIMessage";
import ErrorMessage from "./ErrorMessage";
import SystemMessage from "./SystemMessage";
import { alpha } from "@mui/material/styles";
import { StreamEvent } from "@/services/chat/StreamEventHandler";

interface Message {
  id: string;
  type: "user" | "ai" | "error" | "system";
  role?: "user" | "assistant" | "system" | "error";
  content: string;
  timestamp: string;
  error?: any;
  modelId?: string;
  providerId?: string;
}

interface MessageListProps {
  messages: Message[];
}

export interface MessageListRef {
  handleStreamEvent: (event: StreamEvent) => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(
  ({ messages }, ref) => {
    const theme = useTheme();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<
      Map<string, { handleStreamEvent: (event: StreamEvent) => void }>
    >(new Map());

    // 新增状态用于跟踪占位高度
    const [placeholderHeight, setPlaceholderHeight] = useState(0);
    const prevMessagesLength = useRef(messages.length);

    // 新增用户消息追踪逻辑
    const userMessageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 暴露事件处理方法
    useImperativeHandle(
      ref,
      () => ({
        handleStreamEvent: (event: StreamEvent) => {
          // console.log("MessageList received event:", event);
          const messageRef = messageRefs.current.get(event.messageId);
          if (messageRef) {
            // console.log("Found message ref, forwarding event");
            messageRef.handleStreamEvent(event);
          } else {
            // console.log("No message ref found for:", event.messageId);
          }
        },
      }),
      []
    );

    // 修改滚动逻辑
    useEffect(() => {
      const container = containerRef.current;
      if (!container || messages.length === 0) return;

      // 获取最新用户消息
      const lastUserMessage = [...userMessageRefs.current.values()].pop();
      
      if (lastUserMessage) {
        // 计算需要滚动的位置
        const targetPosition = lastUserMessage.offsetTop - container.offsetTop - 20;
        const containerHeight = container.clientHeight;
        const messageHeight = lastUserMessage.clientHeight;
        
        // 计算占位高度
        const placeholderHeight = Math.max(0, containerHeight - messageHeight - 40);
        
        // 创建占位元素
        const placeholder = document.createElement('div');
        placeholder.style.height = `${placeholderHeight}px`;
        container.appendChild(placeholder);

        // 执行精准滚动
        container.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // 清理占位元素
        setTimeout(() => {
          if (placeholder.parentNode === container) {
            container.removeChild(placeholder);
          }
        }, 1000);
      }
    }, [messages]);

    // 确保消息格式正确
    const formattedMessages = messages.map((message) => {
      return {
        ...message,
        id: message.id || Date.now().toString(),
        timestamp: message.timestamp || new Date().toISOString(),
      };
    });
    // 在formattedMessages之后添加：
    // console.log("处理前的消息:", messages);
    // console.log("处理后的消息:", formattedMessages);
    // console.log("MessageList rendering messages:", messages);

    return (
      <Box
        ref={containerRef}
        sx={{
          flexGrow: 1,
          height: '100%',
          overflow: 'auto',
          bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
          display: 'flex',
          flexDirection: 'column',
          px: 2,
          py: 3,
          '& > *:not(:last-child)': {
            mb: 0.5,
          },
          // 新增动态占位区域
          '&::after': {
            content: '""',
            flex: '1 1 auto',
            minHeight: 'calc(100vh - 300px)',
            pointerEvents: 'none'
          }
        }}
      >
        {formattedMessages.map((message) => {
          // console.log("Rendering message:", message);
          switch (message.type) {
            case "user":
              return (
                <UserMessage
                  key={message.id}
                  ref={(el) => {
                    if (el) {
                      userMessageRefs.current.set(message.id, el);
                    } else {
                      userMessageRefs.current.delete(message.id);
                    }
                  }}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              );
            case "ai":
              return (
                <AIMessage
                  key={message.id}
                  messageId={message.id}
                  ref={(el) => {
                    if (el) {
                      // console.log("Setting ref for message:", message.id);
                      messageRefs.current.set(message.id, el);
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                  initialContent={message.content || ""}
                  timestamp={message.timestamp}
                  modelId={message.modelId}
                  providerId={message.providerId}
                />
              );
            case "system":
              return (
                <SystemMessage
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              );
            case "error":
              return (
                <ErrorMessage
                  key={message.id}
                  error={message.error}
                  timestamp={message.timestamp}
                  modelId={message.modelId}
                  providerId={message.providerId}
                />
              );
            default:
              console.log("未知消息类型:", message.type, message);
              return null;
          }
        })}
      </Box>
    );
  }
);

MessageList.displayName = "MessageList";

export default MessageList;
