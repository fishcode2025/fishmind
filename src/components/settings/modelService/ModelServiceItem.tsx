import React from 'react';
import { 
  Box, 
  Typography, 
  Switch 
} from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';

import { Avatar } from '@mui/material';

interface ModelServiceItemProps {
  name: string;
  providerId?: string;
  icon?: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  onClick: () => void;
  isSelected?: boolean;
}

export const ModelServiceItem: React.FC<ModelServiceItemProps> = ({
  name,
  providerId,
  icon,
  enabled,
  onToggle,
  onClick,
  isSelected = false
}) => {
  // 获取供应商图标
  // const providerLogo = providerId ? getProviderLogo(providerId) : undefined;
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 1, 
        bgcolor: isSelected ? 'action.selected' : 'background.paper',
        borderBottom: 1, 
        borderColor: 'divider',
        cursor: 'pointer'
      }}
      onClick={onClick}
    >

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
