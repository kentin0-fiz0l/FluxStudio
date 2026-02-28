import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { CARD_BORDER_COLORS } from './dashboard-constants';
import type { ContextualCard } from './dashboard-utils';

interface ContextualCardsGridProps {
  cards: ContextualCard[];
  className?: string;
}

export function ContextualCardsGrid({ cards, className }: ContextualCardsGridProps) {
  if (cards.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
              CARD_BORDER_COLORS[card.color]
            )}
            onClick={card.action}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={20} className="text-gray-600" aria-hidden="true" />
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {card.badge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
