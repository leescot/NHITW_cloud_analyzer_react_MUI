import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import ScienceIcon from '@mui/icons-material/Science';
import ImageIcon from '@mui/icons-material/Image';
import WarningIcon from '@mui/icons-material/Warning';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import DescriptionIcon from '@mui/icons-material/Description';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SummarizeIcon from '@mui/icons-material/Summarize';
import GrassIcon from '@mui/icons-material/Grass';

const DataStatusTab = ({ dataStatus }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to get the appropriate icon for each data type
  const getDataTypeIcon = (key) => {
    const icons = new Map([
      ['medication', <LocalPharmacyIcon fontSize="large" />],
      ['labData', <ScienceIcon fontSize="large" />],
      ['chineseMed', <GrassIcon fontSize="large" />],
      ['imaging', <ImageIcon fontSize="large" />],
      ['allergy', <WarningIcon fontSize="large" />],
      ['surgery', <MedicalServicesIcon fontSize="large" />],
      ['discharge', <DescriptionIcon fontSize="large" />],
      ['medDays', <AccessTimeIcon fontSize="large" />],
      ['patientSummary', <SummarizeIcon fontSize="large" />]
    ]);

    return icons.get(key) || <DescriptionIcon fontSize="large" />;
  };

  // Monitor for loading state
  useEffect(() => {
    const checkLoadingState = () => {
      chrome.runtime.sendMessage({ action: "getLoadingState" }, (response) => {
        if (response && response.isLoading) {
          setIsLoading(response.isLoading);
        } else {
          setIsLoading(false);
        }
      });
    };

    checkLoadingState();
    const intervalId = setInterval(checkLoadingState, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Box sx={{ flexGrow: 1, mt: 1 }}>
      <Grid container spacing={2}>
        {Object.entries(dataStatus).map(([key, value]) => (
          !['adultHealthCheck', 'cancerScreening'].includes(key) && (
          <Grid item xs={4} key={key}>
            <Paper
              elevation={1}
              sx={{
                p: 1.5,
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: value.count > 0 ? 'rgba(232, 245, 233, 0.5)' : 'white'
              }}
            >
              {getDataTypeIcon(key)}
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                {getShortLabel(key)}
              </Typography>
              <Box sx={{ position: 'relative', minHeight: '24px', display: 'flex', alignItems: 'center' }}>
                {value.status === 'loading' ? (
                  <CircularProgress size={20} />
                ) : (
                  <Typography
                    variant="body2"
                    color={value.count > 0 ? 'success.main' : 'text.secondary'}
                    fontWeight={value.count > 0 ? 'bold' : 'normal'}
                  >
                    {value.count > 0 ? `${value.count}筆` : '無資料'}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
          )
        ))}
      </Grid>
    </Box>
  );
};

// Helper function to get short data type labels
const getShortLabel = (key) => {
  // # zh-TW: 使用 Map 來保存資料型別與對應短標籤的映射關係
  const labels = new Map([
    ['medication', '西藥'],
    ['labData', '檢驗'],
    ['chineseMed', '中藥'],
    ['imaging', '影像'],
    ['allergy', '過敏'],
    ['surgery', '手術'],
    ['discharge', '出院'],
    ['medDays', '餘藥'],
    ['patientSummary', '摘要']
  ]);

  // 返回對應的短標籤，若找不到則返回原始 key
  return labels.get(key) || key;
};

export default DataStatusTab;