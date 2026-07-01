"use client";

import { useState, useEffect } from 'react';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export function useRole() {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payloadBase64 = token.split('.')[1];
        const decodedJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(decodedJson);
        if (payload.role) {
          setRole(payload.role as Role);
        }
      } catch (err) {
        console.error('Failed to parse JWT role', err);
      }
    }
  }, []);

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';
  const canManageTeam = isOwnerOrAdmin;
  const canManageDataSources = isOwnerOrAdmin;
  const canManageCanonicalModels = isOwnerOrAdmin;
  const canManageReports = isOwnerOrAdmin || role === 'MEMBER';
  const isViewer = role === 'VIEWER';

  return {
    role,
    isOwnerOrAdmin,
    canManageTeam,
    canManageDataSources,
    canManageCanonicalModels,
    canManageReports,
    isViewer,
  };
}
