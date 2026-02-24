/**
 * PluginManagerPage — Route wrapper for the Plugin Manager.
 *
 * Sprint 36: Phase 4.1 Plugin System.
 */

import { DashboardLayout } from '@/components/templates/DashboardLayout';
import { PluginManager } from '@/components/plugins/PluginManager';
import { useAuth } from '@/store/slices/authSlice';

export default function PluginManagerPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout
      user={user || undefined}
      breadcrumbs={[
        { label: 'Projects', path: '/projects' },
        { label: 'Plugins', path: '/plugins' },
      ]}
    >
      <PluginManager />
    </DashboardLayout>
  );
}
