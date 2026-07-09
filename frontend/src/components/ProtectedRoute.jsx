// By: Md. Fahim Bin Amin
//
// Route guard: redirects to /login when no API token is stored, otherwise renders the
// wrapped route as-is.

import { Navigate } from "react-router-dom";

import { isAuthenticated } from "../api/auth";

/**
 * @param {object} props
 * @param {React.ReactNode} props.children - the route content to render when authenticated
 * @returns {JSX.Element}
 */
export function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
