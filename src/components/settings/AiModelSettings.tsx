import React, { useEffect } from "react";
import { Box } from "@mui/material";
import ModelServiceSettingsPage from "./modelService/ModelServiceSettingsPage";
import { ServiceContainer } from "../../services/ServiceContainer";
import { IAiModelService } from "../../services/interfaces";
import { SERVICE_KEYS } from "@/services/constants";

/**
 * AI模型设置页面
 */
const AiModelSettings: React.FC = () => {
  // 确保服务已初始化
  useEffect(() => {
    const aiModelService = ServiceContainer.getInstance().get<IAiModelService>(
      SERVICE_KEYS.AI_MODEL
    );
    if (!aiModelService) {
      console.error("AiModelService 未注册");
    }
  }, []);

  return (
    <Box sx={{ p: 2, overflow: "hidden", height: "100%" }}>
      <ModelServiceSettingsPage />
    </Box>
  );
};

export default AiModelSettings;
