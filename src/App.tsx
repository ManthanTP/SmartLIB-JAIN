import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import './App.css';

// Lazy load pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const BookDetails = lazy(() => import('./pages/BookDetails').then(m => ({ default: m.BookDetails })));
const SeatsPage = lazy(() => import('./pages/SeatsPage').then(m => ({ default: m.SeatsPage })));
const AdminInventory = lazy(() => import('./pages/AdminInventory').then(m => ({ default: m.AdminInventory })));
const AdminLoans = lazy(() => import('./pages/AdminLoans').then(m => ({ default: m.AdminLoans })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminStudentDetails = lazy(() => import('./pages/AdminStudentDetails').then(m => ({ default: m.AdminStudentDetails })));
const AdminSettings = lazy(() => import('./pages/AdminSettings').then(m => ({ default: m.AdminSettings })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const StudentLoans = lazy(() => import('./pages/StudentLoans').then(m => ({ default: m.StudentLoans })));
const AdminFines = lazy(() => import('./pages/AdminFines').then(m => ({ default: m.AdminFines })));
const AdminAcquisitions = lazy(() => import('./pages/AdminAcquisitions').then(m => ({ default: m.AdminAcquisitions })));
const RequestBook = lazy(() => import('./pages/RequestBook').then(m => ({ default: m.RequestBook })));
const LibraryRules = lazy(() => import('./pages/LibraryRules').then(m => ({ default: m.LibraryRules })));
const PublicVerify = lazy(() => import('./pages/PublicVerify').then(m => ({ default: m.PublicVerify })));
const VtuResources = lazy(() => import('./pages/VtuResources').then(m => ({ default: m.VtuResources })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const AdminResources = lazy(() => import('./pages/AdminResources').then(m => ({ default: m.AdminResources })));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify/:id" element={<PublicVerify />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/books" element={<Catalog />} />
              <Route path="/books/:id" element={<BookDetails />} />
              <Route path="/seats" element={<SeatsPage />} />
              <Route path="/my-loans" element={<StudentLoans />} />
              <Route path="/reservations" element={<StudentLoans />} />
              <Route path="/request-book" element={<RequestBook />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/rules" element={<LibraryRules />} />
              <Route path="/resources" element={<VtuResources />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/inventory" element={<ProtectedRoute requireAdmin><AdminInventory /></ProtectedRoute>} />
              <Route path="/admin/loans" element={<ProtectedRoute requireAdmin><AdminLoans /></ProtectedRoute>} />
              <Route path="/admin/fines" element={<ProtectedRoute requireAdmin><AdminFines /></ProtectedRoute>} />

              <Route path="/admin/acquisitions" element={<ProtectedRoute requireAdmin><AdminAcquisitions /></ProtectedRoute>} />
              <Route path="/admin/resources" element={<ProtectedRoute requireAdmin><AdminResources /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><AdminUsers /></ProtectedRoute>} />
              <Route path="/admin/users/:id" element={<ProtectedRoute requireAdmin><AdminStudentDetails /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
              {/* Legacy Redirects for stability */}
              <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
              <Route path="/dashboard/books" element={<Navigate to="/books" replace />} />
              <Route path="/dashboard/resources" element={<Navigate to="/resources" replace />} />
              <Route path="/dashboard/request-book" element={<Navigate to="/request-book" replace />} />
              <Route path="/dashboard/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/dashboard/seats" element={<Navigate to="/seats" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
