import React, { useState, useEffect } from "react";
import { Box, useTheme } from "@mui/material";
import AssistantTabs from "./AssistantTabs";
import AssistantList from "./AssistantList";
import TopicList from "./TopicList";
import SettingsList from "./SettingsList";
import { Topic, AiModel, AiModelProvider, Assistant } from "../../../models/chat";
import { ServiceContainer } from "../../../services/ServiceContainer";
import { SERVICE_KEYS } from "../../../services/constants";
import { IChatService } from "../../../services/interfaces";

// 在 AssistantPanel.tsx 中
interface AssistantPanelProps {
  onSelectAssistant: (assistant: {
    provider: AiModelProvider;
    model: AiModel;
  }) => void;
  selectedAssistant: { provider: AiModelProvider; model: AiModel } | null;
  onSelectTopic: (topic: Topic) => void;
  selectedTopicId?: string;
}

const AssistantPanel: React.FC<AssistantPanelProps> = ({
  onSelectAssistant,
  selectedAssistant,
  onSelectTopic,
  selectedTopicId,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const [currentAssistantName, setCurrentAssistantName] = useState<string | undefined>(undefined);
  const [currentAssistantId, setCurrentAssistantId] = useState<string | undefined>(undefined);

  // 处理助手选择事件
  const handleAssistantSelected = async (assistantId: string, assistantName: string) => {
    try {
      // 设置当前选中的助手名称和ID
      setCurrentAssistantName(assistantName);
      setCurrentAssistantId(assistantId);
      
      // 获取聊天服务
      const serviceContainer = ServiceContainer.getInstance();
      const chatService = serviceContainer.get<IChatService>(SERVICE_KEYS.CHAT);
      
      if (!chatService) {
        throw new Error("聊天服务未初始化");
      }
      
      // 强制创建新话题，确保每次点击都创建新话题
      const newTopic = await chatService.createTopicFromAssistant(assistantId);
      console.log("从助手创建新话题:", newTopic);
      
      // 切换到话题页
      setTabValue(1);
      
      // 选中新创建的话题
      if (onSelectTopic) {
        onSelectTopic(newTopic);
      }
    } catch (error) {
      console.error('创建话题失败:', error);
    }
  };

  return (
    <Box
      sx={{
        width: 300,
        minWidth: 300,
        maxWidth: 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        margin: 0,
        padding: 0,
        overflowX: "hidden",
      }}
    >
      {/* 标签页 */}
      <AssistantTabs 
        value={tabValue} 
        onChange={(e, newValue) => {
          setTabValue(newValue);
          // 如果切换到助手标签页，清除当前助手信息
          if (newValue === 0) {
            setCurrentAssistantName(undefined);
            setCurrentAssistantId(undefined);
          }
        }} 
      />

      {/* 内容区域 */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", width: "100%" }}>
        {tabValue === 0 && (
          <AssistantList
            onSelectAssistant={onSelectAssistant}
            selectedAssistant={selectedAssistant}
            onCreateAssistant={() => {}}
            onAssistantSelected={handleAssistantSelected}
          />
        )}
        {tabValue === 1 && (
          <TopicList
            onSelectTopic={onSelectTopic}
            selectedTopicId={selectedTopicId}
            currentAssistantName={currentAssistantName}
            currentAssistantId={currentAssistantId}
          />
        )}
      </Box>
    </Box>
  );
};

export default AssistantPanel;
