import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
    children: React.ReactNode;
    requireAdmin?: boolean;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
    const { user, profile, loading, isAdmin } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        // Redirect non-admins to student dashboard
        return <Navigate to="/dashboard" replace />;
    }

    // Check if account status is active
    if (profile?.status !== 'active') {
        // We could redirect to a status page, but for now just showing an alert or similar approach
        // Ideally we should have a "PendingApproval" page.
        if (profile?.status === 'pending') {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="p-8 bg-white rounded shadow text-center">
                        <h2 className="text-2xl font-bold text-yellow-600 mb-2">Account Pending</h2>
                        <p className="text-gray-600">Your account is awaiting administrator approval.</p>
                        <button onClick={() => window.location.reload()} className="mt-4 text-primary hover:underline">Check again</button>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
};
