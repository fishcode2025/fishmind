import React, { useState, useEffect } from "react";
import { Box, Button, Theme, Avatar, Typography, Switch } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloudIcon from "@mui/icons-material/Cloud";
import {
  ModelServiceManager,
  ModelServiceProvider,
} from "../../services/modelService";
import { ProviderConfigPanel } from "./modelService/ProviderConfigPanel";
import { getProviderLogo } from "../../config/providers";
import { configService } from "../../services/system/ConfigService";

// 模型服务项组件
interface ModelServiceItemProps {
  name: string;
  icon?: string;
  providerId?: string;
  enabled: boolean;
  onToggle: () => void;
  onClick: () => void;
}

const ModelServiceItem: React.FC<ModelServiceItemProps> = ({
  name,
  icon,
  providerId,
  enabled,
  onToggle,
  onClick,
}) => {
  // 获取供应商图标
  const providerLogo = providerId ? getProviderLogo(providerId) : undefined;

  // 添加调试信息
  console.log("ModelServiceItem Debug:", {
    providerId,
    providerLogo,
    name,
    enabled,
  });

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1,
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Box sx={{ mr: 2 }}>
        {providerLogo ? (
          <>
            <img
              src={providerLogo}
              alt={name}
              style={{ width: 24, height: 24 }}
              onError={(e) => {
                console.error("图标加载失败:", {
                  providerId,
                  providerLogo,
                  error: e,
                });
              }}
            />
            <div style={{ display: "none" }}>
              Debug: {JSON.stringify({ providerLogo })}
            </div>
          </>
        ) : (
          <CloudIcon />
        )}
      </Box>
      <Typography sx={{ flexGrow: 1 }}>{name}</Typography>
      <Switch
        checked={enabled}
        onChange={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        color="primary"
      />
    </Box>
  );
};

const ModelServiceSettings: React.FC = () => {
  // 模型服务数据
  const [modelServices, setModelServices] = useState<
    Array<{
      id: string;
      name: string;
      enabled: boolean;
    }>
  >([]);

  // 当前选中的服务
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // 初始化模型服务
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const serviceManager = new ModelServiceManager();
        const currentSettings = configService.getUserSettings();
        const providers = currentSettings.models.providers;

        if (providers.length === 0) {
          // 如果没有提供商，先初始化
          await serviceManager.initializeProviders();
          // 再次获取提供商列表
          const initializedProviders = await serviceManager.getAllProviders();
          setModelServices(
            initializedProviders.map((p: ModelServiceProvider) => ({
              id: p.id,
              name: p.name || p.id,
              enabled: p.enabled,
            }))
          );
          if (initializedProviders.length > 0) {
            setSelectedService(initializedProviders[0].id);
          }
        } else {
          const mappedProviders = providers.map(
            (p: { id: string; enabled?: boolean }) => ({
              id: p.id,
              name: p.id,
              enabled: p.enabled ?? true,
            })
          );
          setModelServices(mappedProviders);
          if (mappedProviders.length > 0) {
            setSelectedService(mappedProviders[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load providers", error);
      }
    };

    loadProviders();
  }, []);

  // 处理服务开关切换
  const handleServiceToggle = async (id: string) => {
    try {
      const serviceManager = new ModelServiceManager();
      const provider = await serviceManager.getProvider(id);
      if (!provider) {
        throw new Error("Provider not found");
      }

      // 更新本地状态
      setModelServices(
        modelServices.map((service) =>
          service.id === id
            ? { ...service, enabled: !service.enabled }
            : service
        )
      );

      // 更新提供商配置
      const updatedProvider = {
        ...provider,
        enabled: !provider.enabled,
      };

      // 保存到 ModelServiceManager
      await serviceManager.saveProvider(updatedProvider);

      // 获取当前设置并更新
      const currentSettings = configService.getUserSettings();
      const providerIndex = currentSettings.models.providers.findIndex(
        (p) => p.id === id
      );

      if (providerIndex >= 0) {
        const newProviders = [...currentSettings.models.providers];
        newProviders[providerIndex] = {
          ...newProviders[providerIndex],
          enabled: !provider.enabled,
        };

        // 通过 ConfigService 保存更新
        await configService.updateUserSettings({
          models: {
            ...currentSettings.models,
            providers: newProviders,
          },
        });
      }
    } catch (error) {
      console.error("Failed to toggle provider", error);
      // 如果保存失败，回滚本地状态
      setModelServices(modelServices);
    }
  };

  // 处理服务选择
  const handleServiceSelect = (id: string) => {
    setSelectedService(id);
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          height: "100%",
          margin: 0,
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* 左侧模型服务列表 */}
        <Box
          sx={{
            width: 200,
            height: "100%",
            overflow: "auto",
            borderRight: (theme: Theme) => `1px solid ${theme.palette.divider}`,
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            {modelServices.map((service) => (
              <ModelServiceItem
                key={service.id}
                name={service.name}
                providerId={service.id}
                enabled={service.enabled}
                onToggle={() => handleServiceToggle(service.id)}
                onClick={() => handleServiceSelect(service.id)}
              />
            ))}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ borderRadius: 0 }}
            >
              添加
            </Button>
          </Box>
        </Box>

        {/* 右侧详细设置 */}
        <Box
          sx={{
            flexGrow: 1,
            height: "100%",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            margin: 0,
            padding: 0,
          }}
        >
          {/* 使用ProviderConfigPanel组件 */}
          {selectedService && (
            <ProviderConfigPanel
              providerId={selectedService}
              onConfigChange={() => {
                // 重新加载服务列表
                const serviceManager = new ModelServiceManager();
                serviceManager.getAllProviders().then((providers) => {
                  if (providers.length > 0) {
                    setModelServices(
                      providers.map((p) => ({
                        id: p.id,
                        name: p.name,
                        enabled: p.enabled,
                      }))
                    );
                  }
                });
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ModelServiceSettings;
