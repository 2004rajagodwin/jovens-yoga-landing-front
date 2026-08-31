import { Navigate } from "react-router-dom";
import { isAdminAuthenticated } from "../../services/adminAuth.js";

export default function ProtectedAdminRoute({ children }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}
