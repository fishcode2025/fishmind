import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  FormHelperText,
  Alert,
} from "@mui/material";
import { AiModel, AiModelProvider } from "../../../models/chat";

// 模型能力选项
const CAPABILITIES = [
  "chat",
  "completion",
  "embedding",
  "image-generation",
  "audio-transcription",
  "function-calling",
];

// 模型分组选项
const MODEL_GROUPS = [
  "general",
  "coding",
  "creative",
  "vision",
  "audio",
  "embedding",
];

interface ModelPanelProps {
  model: AiModel | null;
  providers: AiModelProvider[];
  providerId?: string;
  onSave: (
    model: Omit<AiModel, "id" | "createdAt" | "updatedAt">
  ) => Promise<void>;
  onCancel: () => void;
}

/**
 * 模型编辑面板
 */
const ModelPanel: React.FC<ModelPanelProps> = ({
  model,
  providers,
  providerId,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contextWindow, setContextWindow] = useState(4096);
  const [maxTokens, setMaxTokens] = useState(4096);

  // 初始化表单数据
  useEffect(() => {
    if (model) {
      setName(model.name);
      // 使用可选链或默认值处理可能不存在的属性
      setModelId(model.modelId || "");
      setSelectedProviderId(model.providerId);
      setGroupId(model.groupId);
      setCapabilities(model.capabilities);
      setContextWindow(model.contextWindow || 4096);
      setMaxTokens(model.maxTokens || 4096);
    } else {
      // 新建模型的默认值
      setName("");
      setModelId("");
      setSelectedProviderId(providerId || "");
      setGroupId("general");
      setCapabilities(["chat"]);
      setContextWindow(4096);
      setMaxTokens(4096);
    }
    setErrors({});
  }, [model, providerId]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "模型名称不能为空";
    }

    if (!modelId.trim()) {
      newErrors.modelId = "模型ID不能为空";
    }

    if (!selectedProviderId) {
      newErrors.providerId = "必须选择提供商";
    }

    if (!groupId) {
      newErrors.groupId = "必须选择分组";
    }

    if (capabilities.length === 0) {
      newErrors.capabilities = "至少选择一个能力";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理能力选择变化
  const handleCapabilitiesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setCapabilities(typeof value === "string" ? value.split(",") : value);
  };

  // 处理保存
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    // 确保 providerId 有值
    if (!providerId) {
      setErrors((prev) => ({ ...prev, providerId: "必须选择提供商" }));
      return;
    }

    const modelData = {
      name,
      providerId, // 现在确保不会是 undefined
      groupId,
      capabilities,
      modelId,
      contextWindow,
      maxTokens,
      config: {},
    };

    await onSave(modelData);
  };

  return (
    <Box sx={{ p: 2, height: "100%", overflow: "auto" }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        {model ? `编辑模型: ${model.name}` : "添加新模型"}
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            模型名称
          </Typography>
          <TextField
            fullWidth
            placeholder="例如: GPT-4, Claude 3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            variant="outlined"
            size="small"
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            模型ID
          </Typography>
          <TextField
            fullWidth
            placeholder="提供商API中使用的ID，例如: gpt-4-turbo"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            error={!!errors.modelId}
            helperText={errors.modelId}
            required
            variant="outlined"
            size="small"
          />
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              提供商
            </Typography>
            <FormControl
              fullWidth
              error={!!errors.providerId}
              required
              size="small"
            >
              <Select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                displayEmpty
                disabled={model !== null} // 编辑时不允许更改提供商
                variant="outlined"
              >
                <MenuItem value="" disabled>
                  选择提供商
                </MenuItem>
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.providerId && (
                <FormHelperText>{errors.providerId}</FormHelperText>
              )}
            </FormControl>
          </Box>

          <Box sx={{ flex: "1 1 200px", minWidth: 0 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              分组
            </Typography>
            <FormControl
              fullWidth
              error={!!errors.groupId}
              required
              size="small"
            >
              <Select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                displayEmpty
                variant="outlined"
              >
                <MenuItem value="" disabled>
                  选择分组
                </MenuItem>
                {MODEL_GROUPS.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
              {errors.groupId && (
                <FormHelperText>{errors.groupId}</FormHelperText>
              )}
            </FormControl>
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            能力
          </Typography>
          <FormControl
            fullWidth
            error={!!errors.capabilities}
            required
            size="small"
          >
            <Select
              multiple
              value={capabilities}
              onChange={handleCapabilitiesChange}
              input={<OutlinedInput />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              variant="outlined"
            >
              {CAPABILITIES.map((capability) => (
                <MenuItem key={capability} value={capability}>
                  {capability}
                </MenuItem>
              ))}
            </Select>
            {errors.capabilities && (
              <FormHelperText>{errors.capabilities}</FormHelperText>
            )}
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button variant="outlined" onClick={onCancel} size="small">
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          color="primary"
          size="small"
        >
          保存
        </Button>
      </Box>

      {model && (
        <Alert severity="info" sx={{ mt: 2 }} variant="outlined">
          提示: 修改模型ID可能会影响现有的聊天记录。
        </Alert>
      )}
    </Box>
  );
};

export default ModelPanel;
