import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StudioDashboard } from '@/components/studio/studio-dashboard';

export const metadata = {
  title: 'Studio',
  description: 'Your FluxStudio creative workspace',
};

export default async function StudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch user's projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(10);

  return <StudioDashboard user={user} projects={projects || []} />;
}
