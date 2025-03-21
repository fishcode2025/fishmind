import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Box, useTheme } from "@mui/material";
import UserMessage from "./UserMessage";
import AIMessage from "./AIMessage";
import ErrorMessage from "./ErrorMessage";
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

    // 自动滚动到最新消息
    useEffect(() => {
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      };

      const observer = new ResizeObserver(scrollToBottom);
      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      scrollToBottom();

      return () => {
        observer.disconnect();
      };
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
          height: "100%",
          overflow: "auto",
          bgcolor:
            theme.palette.mode === "dark" ? "background.default" : "grey.50",
          display: "flex",
          flexDirection: "column",
          px: 2,
          py: 3,
          scrollBehavior: "smooth",
          "&::-webkit-scrollbar": {
            width: "8px",
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.1),
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.2),
            },
          },
          "& > *:not(:last-child)": {
            mb: 3,
          },
        }}
      >
        {formattedMessages.map((message) => {
          // console.log("Rendering message:", message);
          switch (message.type) {
            case "user":
              return (
                <UserMessage
                  key={message.id}
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
              return null;
          }
        })}
        <div ref={messagesEndRef} style={{ height: 1, width: "100%" }} />
      </Box>
    );
  }
);

MessageList.displayName = "MessageList";

export default MessageList;
