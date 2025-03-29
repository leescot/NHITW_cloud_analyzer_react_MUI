import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import PopupSettings from './components/PopupSettings';
import theme from './theme';

// Initialize the popup UI
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('popup-root');
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <PopupSettings />
        </ThemeProvider>
      </React.StrictMode>
    );
  }
});