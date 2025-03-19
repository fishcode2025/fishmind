import React from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';

// 定义模型能力类型
type ModelCapability = 'chat' | 'image' | 'embedding' | 'reasoning';

// 定义能力标签配置
const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  'chat': '对话',
  'image': '图像',
  'embedding': '嵌入',
  'reasoning': '推理'
};

// 模型项组件
interface ModelItemProps {
  name: string;
  id: string;
  icon: React.ReactNode;
  capabilities?: ModelCapability[];
  onRemove: () => void;
  onSettings: () => void;
}

export const ModelItem: React.FC<ModelItemProps> = ({
  name,
  id,
  icon,
  capabilities,
  onRemove,
  onSettings
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        borderRadius: 2,
        mb: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ mr: 2 }}>{icon}</Box>
      <Typography sx={{ flexGrow: 1 }}>{name}</Typography>
      <IconButton onClick={onSettings} size="small">
        <SettingsSuggestIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={onRemove} size="small" color="error">
        <Box 
          sx={{ 
            width: 20, 
            height: 20, 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            bgcolor: 'error.main',
            color: 'white'
          }}
        >
          -
        </Box>
      </IconButton>
    </Box>
  );
};
