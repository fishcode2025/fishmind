import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  InputAdornment,
  IconButton,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { AiModelProvider } from "../../../models/chat";

// 适配器类型
type AdapterType = "openai" | "ollama" | "silicon" | "deepseek" | "auto";

interface ProviderDialogProps {
  open: boolean;
  provider: AiModelProvider | null;
  onClose: () => void;
  onSave: (provider: Omit<AiModelProvider, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onCheckApiKey?: (apiKey: string, apiUrl: string, adapterType?: string) => Promise<boolean>;
}

const ProviderDialog: React.FC<ProviderDialogProps> = ({
  open,
  provider,
  onClose,
  onSave,
  onCheckApiKey
}) => {
  const [name, setName] = useState(provider?.name ?? "");
  const [apiUrl, setApiUrl] = useState(provider?.apiUrl ?? "");
  const [apiKey, setApiKey] = useState(provider?.apiKey || "");
  const [enabled, setEnabled] = useState(provider?.enabled ?? false);
  const [adapterType, setAdapterType] = useState<AdapterType>("auto");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(false);
  const [apiKeyCheckResult, setApiKeyCheckResult] = useState<boolean | null>(null);

  // 当 provider 属性变化时，更新状态变量
  useEffect(() => {
    if (provider) {
      setName(provider.name || "");
      setApiUrl(provider.apiUrl || "");
      setApiKey(provider.apiKey || "");
      setEnabled(provider.enabled || false);
      
      // 尝试从配置中获取适配器类型
      if (provider.config && provider.config.adapterType) {
        setAdapterType(provider.config.adapterType as AdapterType);
      } else {
        // 根据名称推断适配器类型
        const lowerName = provider.name.toLowerCase();
        if (lowerName.includes('openai')) setAdapterType('openai');
        else if (lowerName.includes('ollama')) setAdapterType('ollama');
        else if (lowerName.includes('silicon')) setAdapterType('silicon');
        else if (lowerName.includes('deepseek')) setAdapterType('deepseek');
        else setAdapterType('auto');
      }
    } else {
      setName("");
      setApiUrl("");
      setApiKey("");
      setEnabled(false);
      setAdapterType("auto");
    }
    setErrors({});
    setApiKeyCheckResult(null);
  }, [provider, open]);

  // 当 API 密钥或 URL 改变时，重置检查结果
  useEffect(() => {
    setApiKeyCheckResult(null);
  }, [apiKey, apiUrl]);

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

    // 如果是自定义供应商，必须选择适配器类型
    if (adapterType === "auto" && !isDefaultProvider(name)) {
      formErrors.adapterType = "请为自定义供应商选择适配器类型";
    }

    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  // 检查是否为默认提供商
  const isDefaultProvider = (providerName: string): boolean => {
    const lowerName = providerName.toLowerCase();
    return (
      lowerName.includes('openai') ||
      lowerName.includes('ollama') ||
      lowerName.includes('silicon') ||
      lowerName.includes('deepseek')
    );
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

    try {
      setIsCheckingApiKey(true);
      setApiKeyCheckResult(null);
      // 调用传入的回调函数，传递适配器类型
      const result = await onCheckApiKey(currentApiKey, currentApiUrl, adapterType);
      setApiKeyCheckResult(result);
    } catch (err) {
      console.error("API密钥检查失败:", err);
      setApiKeyCheckResult(false);
    } finally {
      setIsCheckingApiKey(false);
    }
  };

  // 处理保存
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      // 确保所有必要的字段都有值
      const providerData = {
        name: name.trim(),
        apiUrl: apiUrl.trim(),
        apiKey: apiKey || "", // 确保 apiKey 不是 undefined
        enabled: enabled,
        config: {
          adapterType: adapterType
        },
      };

      await onSave(providerData);
      onClose();
    } catch (error) {
      console.error("保存提供商失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 根据名称自动选择适配器类型
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    // 如果用户手动选择了适配器类型，则不自动更改
    if (adapterType !== "auto") return;
    
    // 根据名称自动选择适配器类型
    const lowerName = newName.toLowerCase();
    if (lowerName.includes('openai')) setAdapterType('openai');
    else if (lowerName.includes('ollama')) setAdapterType('ollama');
    else if (lowerName.includes('silicon')) setAdapterType('silicon');
    else if (lowerName.includes('deepseek')) setAdapterType('deepseek');
    else setAdapterType('auto');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{provider ? "编辑提供商" : "添加提供商"}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            label="提供商名称"
            value={name}
            onChange={handleNameChange}
            fullWidth
            margin="normal"
            error={!!errors.name}
            helperText={errors.name}
            disabled={isLoading}
            required
          />

          <TextField
            label="API 地址"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            fullWidth
            margin="normal"
            error={!!errors.apiUrl}
            helperText={errors.apiUrl}
            disabled={isLoading}
            required
            placeholder="例如: https://api.openai.com"
          />

          <TextField
            label="API 密钥"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            fullWidth
            margin="normal"
            error={!!errors.apiKey}
            helperText={errors.apiKey}
            disabled={isLoading}
            type={showApiKey ? "text" : "password"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                  >
                    {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <FormControl 
            fullWidth 
            margin="normal" 
            error={!!errors.adapterType}
          >
            <InputLabel id="adapter-type-label">适配器类型</InputLabel>
            <Select
              labelId="adapter-type-label"
              value={adapterType}
              label="适配器类型"
              onChange={(e) => setAdapterType(e.target.value as AdapterType)}
              disabled={isLoading}
            >
              <MenuItem value="auto">自动检测</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="ollama">Ollama</MenuItem>
              <MenuItem value="silicon">Silicon</MenuItem>
              <MenuItem value="deepseek">Deepseek</MenuItem>
            </Select>
            {errors.adapterType && (
              <FormHelperText>{errors.adapterType}</FormHelperText>
            )}
            <FormHelperText>
              {adapterType === "auto" 
                ? "系统将根据提供商名称自动选择适配器" 
                : `将使用 ${adapterType} 适配器处理请求`}
            </FormHelperText>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="启用"
            sx={{ mt: 1 }}
          />

          {onCheckApiKey && (
            <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
              <Button
                variant="outlined"
                onClick={handleCheckApiKey}
                disabled={isCheckingApiKey || isLoading}
                sx={{ mr: 2 }}
              >
                {isCheckingApiKey ? "检查中..." : "测试连接"}
              </Button>
              {isCheckingApiKey && <CircularProgress size={24} />}
              {apiKeyCheckResult !== null && !isCheckingApiKey && (
                <Alert
                  severity={apiKeyCheckResult ? "success" : "error"}
                  sx={{ ml: 2, flex: 1 }}
                >
                  {apiKeyCheckResult
                    ? "连接成功！API密钥有效。"
                    : "连接失败！请检查API密钥和地址。"}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={isLoading}
        >
          {isLoading ? "保存中..." : "保存"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProviderDialog; 