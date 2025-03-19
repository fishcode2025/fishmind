import React from "react";
import { Box } from "@mui/material";
import DefaultModelPanel from "./defaultModel/DefaultModelPanel";
import SQLiteServiceTest from "../test_components_integration/SQLiteServiceTest";

const DefaultModelSettings: React.FC = () => {
  return (
    <Box>
      <DefaultModelPanel />
      <SQLiteServiceTest></SQLiteServiceTest>
    </Box>
  );
};

export default DefaultModelSettings;
