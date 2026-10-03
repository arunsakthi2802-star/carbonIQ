import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DataEntry } from './pages/DataEntry';
import { ActivityHistory } from './pages/ActivityHistory';
import { EmissionAnalytics } from './pages/EmissionAnalytics';
import { WhatIfSimulator } from './pages/WhatIfSimulator';
import { AiInsightsPage } from './pages/AiInsightsPage';
import { ComplianceReports } from './pages/ComplianceReports';
import { EmissionFactors } from './pages/EmissionFactors';
import { ModelIntelligence } from './pages/ModelIntelligence';
import { Settings } from './pages/Settings';
import { AdminPanel } from './pages/AdminPanel';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center text-emerald-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">Loading CarbonIQ Environment...</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="data-entry" element={<DataEntry />} />
            <Route path="history" element={<ActivityHistory />} />
            <Route path="analytics" element={<EmissionAnalytics />} />
            <Route path="what-if" element={<WhatIfSimulator />} />
            <Route path="ai-insights" element={<AiInsightsPage />} />
            <Route path="reports" element={<ComplianceReports />} />
            <Route path="factors" element={<EmissionFactors />} />
            <Route path="model" element={<ModelIntelligence />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
