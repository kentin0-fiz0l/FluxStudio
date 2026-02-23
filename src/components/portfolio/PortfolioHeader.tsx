/**
 * PortfolioHeader Component
 * Title, owner info, stats, and cover image
 */

import { Settings, User, Eye, Award } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PortfolioEditForm } from './PortfolioEditForm';
import type { Portfolio } from './types';

interface PortfolioHeaderProps {
  portfolio: Portfolio;
  isOwner: boolean;
  onPortfolioUpdate?: (updates: Partial<Portfolio>) => void;
}

export function PortfolioHeader({
  portfolio,
  isOwner,
  onPortfolioUpdate,
}: PortfolioHeaderProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Cover Image */}
      {portfolio.cover_image_url ? (
        <div
          className="h-64 bg-cover bg-center"
          style={{ backgroundImage: `url(${portfolio.cover_image_url})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        </div>
      ) : (
        <div className="h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
      )}

      {/* Portfolio Info */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full p-8 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-6">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={portfolio.owner.avatar} />
                <AvatarFallback className="text-2xl">{portfolio.owner.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{portfolio.title}</h1>
                <p className="text-xl text-white/90 mb-3">{portfolio.description}</p>

                <div className="flex items-center gap-6 text-white/80">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" aria-hidden="true" />
                    <span>{portfolio.owner.name}</span>
                    <Badge variant="outline" className="text-white border-white/50">
                      {portfolio.owner.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span>{portfolio.stats.total_views.toLocaleString()} views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" aria-hidden="true" />
                    <span>{portfolio.stats.featured_items} featured</span>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-white border-white/50 hover:bg-white/10">
                        <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                        Edit Portfolio
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Portfolio</DialogTitle>
                        <DialogDescription>Update your portfolio information</DialogDescription>
                      </DialogHeader>
                      <PortfolioEditForm
                        portfolio={portfolio}
                        onSave={(updates) => {
                          if (onPortfolioUpdate) onPortfolioUpdate(updates);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
