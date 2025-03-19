import React from "react";
import { Typography, Box, Divider } from "@mui/material";
import DatabaseLocationSetting from "./DatabaseLocationSetting";

const SystemSettings: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        系统设置
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        管理系统级别的设置，包括数据库位置、日志级别等。
      </Typography>

      <Divider sx={{ my: 3 }} />

      <DatabaseLocationSetting />

      {/* 未来可以在这里添加更多系统设置 */}
    </Box>
  );
};

export default SystemSettings;
