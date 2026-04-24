import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('accessToken');

<<<<<<< HEAD
    if (!token) {
=======
    if (!token || token === "undefined") {
>>>>>>> 6604d3b (Сделав имя, аватарку в профиле)
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;