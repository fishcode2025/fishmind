import React from 'react';
import { Tabs, Tab, useTheme } from '@mui/material';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

interface AssistantTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const AssistantTabs: React.FC<AssistantTabsProps> = ({ value, onChange }) => {
  const theme = useTheme();
  
  return (
    <Tabs 
      value={value} 
      onChange={onChange}
      variant="fullWidth"
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        minHeight: 48,
      }}
    >
      <Tab 
        icon={<SmartToyOutlinedIcon />}
        iconPosition="start"
        label="助手" 
        sx={{ 
          minHeight: 48,
          py: 1.5,
          '& .MuiTab-iconWrapper': {
            marginBottom: 0,
            marginRight: 1
          }
        }}
      />
      <Tab 
        icon={<ChatOutlinedIcon />}
        iconPosition="start"
        label="话题" 
        sx={{ 
          minHeight: 48,
          py: 1.5,
          '& .MuiTab-iconWrapper': {
            marginBottom: 0,
            marginRight: 1
          }
        }}
      />

    </Tabs>
  );
};

export default AssistantTabs; 