import { Building2 } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { MobileOptimizedHeader } from '../MobileOptimizedHeader';

interface OrgSelectorProps {
  organizations: any[];
  navigateTo: (view: 'organization' | 'team' | 'project', id: string) => void | Promise<void>;
}

export function OrgSelector({ organizations, navigateTo }: OrgSelectorProps) {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <MobileOptimizedHeader />
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white/10 border border-white/10 p-8">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-white mb-2">Select an Organization</h2>
              <p className="text-gray-400 mb-6">Choose an organization to view its dashboard</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizations.map((org) => (
                  <Card
                    key={org.id}
                    interactive
                    className="bg-white/10 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors"
                    onClick={() => navigateTo('organization', org.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5" aria-hidden="true" />
                        {org.name}
                      </CardTitle>
                      {org.description && (
                        <CardDescription className="text-gray-400">
                          {org.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
