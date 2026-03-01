import { useNavigate } from 'react-router-dom';
import { MobileOptimizedHeader } from '../MobileOptimizedHeader';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Users } from 'lucide-react';

export function TeamNotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <MobileOptimizedHeader />
      <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white/10 border border-white/10 p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-white/40 mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-2xl font-bold text-white mb-2">Team Not Found</h2>
              <p className="text-gray-400 mb-6">The requested team could not be found or you don't have access to it.</p>
              <Button onClick={() => navigate('/dashboard')} className="bg-blue-500 hover:bg-blue-600 text-white">
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
