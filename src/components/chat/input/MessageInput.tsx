import React, { useState } from "react";
import {
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  useTheme,
  Box,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import TranslateIcon from "@mui/icons-material/Translate";
import InputToolbar from "./InputToolbar";
import { AiModel, AiModelProvider } from "../../../models/chat";

interface MessageInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  selectedAssistant?: { provider: AiModelProvider; model: AiModel } | null;
  onMcpToolCall?: (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ) => Promise<any>;
  currentTopicId?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  selectedAssistant = null,
  onMcpToolCall,
  currentTopicId,
}) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState("");

  // 处理消息输入变化
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  // 处理消息发送
  const handleSendMessage = () => {
    if (inputValue.trim() && onSendMessage && !disabled) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  // 处理键盘事件（按Enter发送消息）
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey && !disabled) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // 处理工具栏动作
  const handleToolAction = (action: string) => {
    console.log("工具栏动作:", action);
    // 这里可以根据不同的动作执行不同的操作
    // 例如：插入@符号、打开附件选择器等
  };

  // 处理翻译按钮点击
  const handleTranslate = () => {
    console.log("翻译内容:", inputValue);
    // 这里添加翻译逻辑
  };

  // 处理MCP工具调用
  const handleMcpToolCall = async (
    configId: string,
    toolName: string,
    params: Record<string, any>
  ) => {
    if (onMcpToolCall) {
      try {
        const result = await onMcpToolCall(configId, toolName, params);
        // 可以在这里处理工具调用结果，例如将结果插入到输入框中
        if (result && typeof result === "string") {
          setInputValue((prev) => prev + "\n" + result);
        } else if (result) {
          setInputValue(
            (prev) => prev + "\n" + JSON.stringify(result, null, 2)
          );
        }
        return result;
      } catch (error) {
        console.error("工具调用失败:", error);
        throw error;
      }
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        borderTop: `1px solid ${theme.palette.divider}`,
        margin: 0,
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 2,
          pb: 0,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={disabled ? "正在等待AI回复..." : "在这里输入消息..."}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="翻译">
                  <IconButton
                    onClick={handleTranslate}
                    disabled={!inputValue.trim() || disabled}
                    sx={{
                      height: 36,
                      mr: 1,
                      bgcolor:
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.04)",
                      "&:hover": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.12)"
                            : "rgba(0, 0, 0, 0.08)",
                      },
                    }}
                  >
                    <TranslateIcon />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || disabled}
                  sx={{ borderRadius: 4 }}
                >
                  发送
                </Button>
              </InputAdornment>
            ),
          }}
        />
        <InputToolbar
          onToolAction={handleToolAction}
          disabled={disabled}
          selectedAssistant={selectedAssistant}
          onMcpToolCall={handleMcpToolCall}
          currentTopicId={currentTopicId}
        />
      </Box>
    </Paper>
  );
};

export default MessageInput;
