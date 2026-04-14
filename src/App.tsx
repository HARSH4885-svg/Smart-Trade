/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { MarketProvider } from './context/MarketContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import Market from './pages/Market/Market';
import StockDetail from './pages/Market/StockDetail';
import Portfolio from './pages/Portfolio/Portfolio';
import Watchlist from './pages/Watchlist/Watchlist';
import TransactionHistory from './pages/History/TransactionHistory';
import Analytics from './pages/Analytics/Analytics';
import Settings from './pages/Settings/Settings';
import AutoTrade from './pages/AutoTrade/AutoTrade';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <PortfolioProvider>
          <MarketProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/market" element={<Market />} />
                  <Route path="/market/:id" element={<StockDetail />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/history" element={<TransactionHistory />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/auto-trade" element={<AutoTrade />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
              <Toaster 
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#111827',
                    color: '#F9FAFB',
                    border: '1px solid #1F2937'
                  }
                }}
              />
            </Router>
          </MarketProvider>
        </PortfolioProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}
