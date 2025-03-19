import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Card,
  CardContent,
  Divider,
  CardActions,
  Tooltip,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { AiModel, AiModelProvider } from "../../../models/chat";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

interface ProviderPanelProps {
  provider: AiModelProvider | null;
  models: AiModel[];
  onSave: (
    provider: Omit<AiModelProvider, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onFetchModels: () => Promise<void>;
  onAddModel?: () => void;
  onAddAllModels?: () => void;
  onEditModel?: (model: AiModel) => void;
  onDeleteModel?: (model: AiModel) => void;
  onCheckApiKey?: (apiKey: string, apiUrl: string) => Promise<boolean>;
  onSetDefaultModel?: (model: AiModel) => void;
  defaultModel?: { providerId: string; modelId: string } | null;
}

/**
 * 提供商详情面板
 */
const ProviderPanel: React.FC<ProviderPanelProps> = ({
  provider,
  models,
  onSave,
  onFetchModels,
  onAddModel,
  onAddAllModels,
  onEditModel,
  onDeleteModel,
  onCheckApiKey,
  onSetDefaultModel,
  defaultModel,
}) => {
  const [name, setName] = useState(provider?.name ?? "");
  const [apiUrl, setApiUrl] = useState(provider?.apiUrl ?? "");
  const [apiKey, setApiKey] = useState(provider?.apiKey || "");
  const [enabled, setEnabled] = useState(provider?.enabled ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(false);
  const [apiKeyCheckResult, setApiKeyCheckResult] = useState<boolean | null>(
    null
  );

  // 表单验证
  const validateForm = (): boolean => {
    const formErrors: Record<string, string> = {};

    // 检查 name 是否为空
    if (!name || !name.trim()) {
      formErrors.name = "提供商名称不能为空";
    }

    // 检查 apiUrl 是否为空或格式是否正确
    if (!apiUrl || !apiUrl.trim()) {
      formErrors.apiUrl = "API地址不能为空";
    } else if (!isValidUrl(apiUrl)) {
      formErrors.apiUrl = "请输入有效的URL";
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // 验证URL格式
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  // 处理 API 密钥检查
  const handleCheckApiKey = async () => {
    if (!onCheckApiKey) return;

    // 使用当前输入框中的值
    const currentApiKey = apiKey.trim();
    const currentApiUrl = apiUrl.trim();

    if (!currentApiUrl) {
      setErrors((prev) => ({ ...prev, apiUrl: "API地址不能为空" }));
      return;
    }

    if (!isValidUrl(currentApiUrl)) {
      setErrors((prev) => ({ ...prev, apiUrl: "请输入有效的URL" }));
      return;
    }

    console.log("检查API密钥，使用当前输入值:", currentApiKey, currentApiUrl);

    try {
      setIsCheckingApiKey(true);
      setApiKeyCheckResult(null);
      // 调用传入的回调函数
      const result = await onCheckApiKey(currentApiKey, currentApiUrl);
      console.log("API密钥检查结果:", result);
      setApiKeyCheckResult(result);
    } catch (err) {
      console.error("API密钥检查失败:", err);
      setApiKeyCheckResult(false);
    } finally {
      setIsCheckingApiKey(false);
    }
  };

  // 当 API 密钥或 URL 改变时，重置检查结果
  useEffect(() => {
    setApiKeyCheckResult(null);
  }, [apiKey, apiUrl]);

  // 当 provider 属性变化时，更新状态变量
  useEffect(() => {
    if (provider) {
      setName(provider.name || "");
      setApiUrl(provider.apiUrl || "");
      setApiKey(provider.apiKey || "");
      setEnabled(provider.enabled || false);
      setErrors({});
      setApiKeyCheckResult(null);
    }
  }, [provider]);

  // 处理保存
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // 确保所有必要的字段都有值
    const providerData = {
      name: name.trim(),
      apiUrl: apiUrl.trim(),
      apiKey: apiKey || "", // 确保 apiKey 不是 undefined
      enabled: enabled,
      config: {},
    };

    await onSave(providerData);
    setIsEditing(false);
    onFetchModels();
  };

  // 处理取消编辑
  const handleCancel = () => {
    if (provider) {
      setName(provider.name || "");
      setApiUrl(provider.apiUrl || "");
      setApiKey(provider.apiKey || "");
      setEnabled(provider.enabled || false);
    } else {
      setName("");
      setApiUrl("");
      setApiKey("");
      setEnabled(false);
    }
    setErrors({});
    setIsEditing(false);
  };

  // 渲染模型列表
  const renderModels = () => {
    if (models.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography color="text.secondary">暂无模型</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        {models.map((model) => {
          // 检查当前模型是否是默认模型
          const isDefault = defaultModel &&
            defaultModel.providerId === model.providerId &&
            defaultModel.modelId === model.id;

          return (
            <Card key={model.id} sx={{ position: "relative" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="h6" component="div">
                    {model.name}
                    {isDefault && (
                      <Chip
                        label="默认"
                        size="small"
                        color="primary"
                        icon={<StarIcon fontSize="small" />}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>

                  <Tooltip title={isDefault ? "当前默认模型" : "设为默认模型"}>
                    <IconButton
                      color={isDefault ? "primary" : "default"}
                      onClick={() => onSetDefaultModel?.(model)}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        bgcolor: "background.paper",
                        boxShadow: 1,
                        "&:hover": {
                          bgcolor: "action.hover",
                        }
                      }}
                    >
                      {isDefault ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  模型ID: {model.modelId}
                </Typography>

                <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {model.capabilities.map((cap) => (
                    <Chip key={cap} label={cap} size="small" />
                  ))}
                </Box>
              </CardContent>

              <Divider />

              <CardActions sx={{ justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => onEditModel?.(model)}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => onDeleteModel?.(model)}
                >
                  删除
                </Button>
              </CardActions>
            </Card>
          );
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            position: "sticky",
            top: 0,
            backgroundColor: "background.paper",
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">{name}</Typography>
            </Box>
            {!isEditing ? (
              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsEditing(true)}
              >
                编辑
              </Button>
            ) : (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="outlined" size="small" onClick={handleCancel}>
                  取消
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSave}
                  color="primary"
                >
                  保存
                </Button>
              </Box>
            )}
          </Box>
          <Divider sx={{ mb: 1 }} />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              API 密钥
            </Typography>
            <TextField
              fullWidth
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setIsEditing(true);
              }}
              disabled={!isEditing}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                      <Button
                        size="small"
                        onClick={handleCheckApiKey}
                        disabled={!apiKey.trim() || isCheckingApiKey}
                        color={
                          apiKeyCheckResult === true
                            ? "success"
                            : apiKeyCheckResult === false
                              ? "error"
                              : "primary"
                        }
                      >
                        {isCheckingApiKey ? "检查中..." : "检查"}
                      </Button>
                    </Box>
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
              placeholder={apiKey ? undefined : "未设置API密钥"}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              API 地址
            </Typography>
            <TextField
              fullWidth
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                setIsEditing(true);
              }}
              disabled={!isEditing}
              error={!!errors.apiUrl}
              helperText={errors.apiUrl}
              variant="outlined"
              size="small"
              placeholder={apiUrl ? undefined : "未设置API地址"}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">模型列表</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {onAddAllModels && (
              <Button
                variant="outlined"
                size="small"
                onClick={onAddAllModels}
                startIcon={<CloudDownloadIcon />}
              >
                获取所有模型
              </Button>
            )}
            {onAddModel && (
              <Button
                variant="outlined"
                size="small"
                onClick={onAddModel}
                startIcon={<AddIcon />}
              >
                添加模型
              </Button>
            )}
          </Box>
        </Box>

        {renderModels()}
      </Box>
    </Box>
  );
};

export default ProviderPanel;
