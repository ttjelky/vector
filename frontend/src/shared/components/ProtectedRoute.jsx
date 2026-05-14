import { Navigate } from "react-router-dom";
import { getAccessToken, getUserRole } from "@api";

/**
 * @param {string[]} allowedRoles — масив дозволених ролей.
 *   Якщо не передано — дозволено будь-якій авторизованій ролі.
 *
 * Роль читається з пам'яті (getUserRole), а не з localStorage —
 * це унеможливлює підміну ролі через DevTools.
 *
 * ВАЖЛИВО: цей компонент рендериться лише після того як App.jsx
 * завершив restoreSession() (authReady === true), тому гонки немає.
 * Якщо токен відсутній після відновлення — редіректимо на лендінг.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = Boolean(getAccessToken());
  const role            = getUserRole() ?? localStorage.getItem("userRole") ?? "";

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export { ProtectedRoute };
