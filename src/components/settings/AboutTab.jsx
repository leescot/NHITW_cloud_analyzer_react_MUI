import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Link,
  Avatar,
  Grid,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import GitHubIcon from '@mui/icons-material/GitHub';
import LanguageIcon from '@mui/icons-material/Language';

// 從 manifest 獲取版本資訊
const manifestData = chrome.runtime.getManifest();

// 貢獻者資料
const contributors = [
  {
    name: "李坤峰醫師",
    englishName: "Kun-Feng Lee",
    role: ["項目主持人", "主要開發者"],
    avatar: "/images/avatars/KF.png", // 使用圖片路徑
    github: "https://github.com/leescot",
    blog: "https://kunfengleemd.blogspot.com/"
  },
  {
    name: "曾建霖醫師",
    englishName: "Chien-Lin Tseng",
    role: "主要開發者",
    avatar: "/images/avatars/CL.png", // 使用圖片路徑
    github: "https://github.com/aszk1415",
    blog: "https://www.facebook.com/profile.php?id=100000204882781"
  },
  {
    name: "林協霆醫師",
    englishName: "Hsieh-Ting Lin",
    role: "技術顧問",
    avatar: "/images/avatars/HT.png", // 使用圖片路徑
    github: "https://github.com/htlin222",
    blog: "https://htl.physician.tw/"
  }
];

const AboutTab = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PeopleIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">貢獻者</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <List disablePadding>
          {contributors.map((contributor, index) => (
            <ListItem key={index} sx={{ py: 1.5 }}>
              <Grid container alignItems="center">
                <Grid item>
                  {contributor.avatar.includes('/') ? (
                    // 如果是圖片路徑
                    <Avatar
                      src={contributor.avatar}
                      alt={contributor.name.split(' ')[0]}
                      sx={{ width: 50, height: 50, mr: 2 }}
                    />
                  ) : (
                    // 如果是文字
                    <Avatar sx={{ width: 50, height: 50, fontSize: '1.2rem', bgcolor: 'grey.400', mr: 2 }}>
                      {contributor.avatar}
                    </Avatar>
                  )}
                </Grid>
                <Grid item xs>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold', mb: 0.2 }}>
                          {contributor.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                          {contributor.englishName}
                        </Typography>
                        {Array.isArray(contributor.role) ? (
                          contributor.role.map((role, roleIndex) => (
                            <Typography
                              key={roleIndex}
                              variant="body2"
                              color="primary"
                              sx={{ fontWeight: 500, lineHeight: 1.2, mb: roleIndex < contributor.role.length - 1 ? 0.5 : 0 }}
                            >
                              {role}
                            </Typography>
                          ))
                        ) : (
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                            {contributor.role}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="column" spacing={0.5} sx={{ ml: 1 }}>
                        {contributor.github && (
                          <Tooltip title="GitHub">
                            <IconButton
                              size="small"
                              color="primary"
                              component="a"
                              href={contributor.github}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: '#24292e', p: 0.5 }}
                            >
                              <GitHubIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {contributor.blog && (
                          <Tooltip title="個人網站">
                            <IconButton
                              size="small"
                              color="primary"
                              component="a"
                              href={contributor.blog}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: '#0078d7', p: 0.5 }}
                            >
                              <LanguageIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EmailIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">聯絡方式</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Typography variant="body1" paragraph>
          如有任何問題、建議或錯誤回報，請透過以下方式聯絡我們：
        </Typography>

        <List disablePadding>
          <ListItem>
            <ListItemText
              primary="Email"
              secondary={<Link href="mailto:aszk1415@gmail.com">aszk1415@gmail.com</Link>}
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="GitHub"
              secondary={
                <Box sx={{ wordBreak: 'break-word' }}>
                  <Link
                    href="https://github.com/leescot/NHITW_cloud_analyzer_react_MUI"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <GitHubIcon sx={{ mr: 0.5, fontSize: '1rem', flexShrink: 0 }} />
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                        hyphens: 'auto'
                      }}
                    >
                      NHITW_cloud_analyzer_react_MUI
                    </Typography>
                  </Link>
                </Box>
              }
            />
          </ListItem>
        </List>
      </Paper>

      <Paper elevation={1} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6">關於擴充功能</Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">名稱</Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body1">{manifestData.name}</Typography>
          </Grid>

          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">版本</Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body1">{manifestData.version}</Typography>
          </Grid>

          <Grid item xs={4}>
            <Typography variant="subtitle2" color="text.secondary">描述</Typography>
          </Grid>
          <Grid item xs={8}>
            <Typography variant="body1">{manifestData.description}</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AboutTab;
