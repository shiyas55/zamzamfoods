import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './routes/AppRoutes';
import { OfflineBanner } from './components/OfflineBanner';

import { SettingsProvider } from './context/SettingsContext';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <OfflineBanner />
        <AuthProvider>
          <SettingsProvider>
            <AppRoutes />
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
