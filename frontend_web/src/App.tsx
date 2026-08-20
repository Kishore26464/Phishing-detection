import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UrlScanner } from './pages/UrlScanner';
import { SmsScanner } from './pages/SmsScanner';
import { QrScanner } from './pages/QrScanner';
import { BulkScan } from './pages/BulkScan';
import { ScanHistory } from './pages/ScanHistory';
import { ResultDetail } from './pages/ResultDetail';
import { Analytics } from './pages/Analytics';
import { Report } from './pages/Report';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/scan/url" element={<ProtectedRoute><UrlScanner /></ProtectedRoute>} />
          <Route path="/scan/sms" element={<ProtectedRoute><SmsScanner /></ProtectedRoute>} />
          <Route path="/scan/qr" element={<ProtectedRoute><QrScanner /></ProtectedRoute>} />
          <Route path="/scan/bulk" element={<ProtectedRoute><BulkScan /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><ScanHistory /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultDetail /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
