import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../lib/auth";

export default function ProtectedRoute() {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
