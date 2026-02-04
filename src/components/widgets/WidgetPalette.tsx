import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useWidgetLayout } from '../../hooks/useWidgetLayout';
import { WIDGET_REGISTRY, getWidgetsByPermission, getAvailableCategories } from './registry';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { cn } from '../ui/utils';
import {
  Search,
  Plus,
  Package,
  Star,
  Filter,
  Grid3X3,
  X,
  Sparkles,
} from 'lucide-react';

interface WidgetPaletteProps {
  className?: string;
}

interface WidgetPreviewProps {
  widgetId: string;
  onAdd: (widgetId: string) => void;
  isAdded: boolean;
}

function WidgetPreview({ widgetId, onAdd, isAdded }: WidgetPreviewProps) {
  const widgetConfig = WIDGET_REGISTRY[widgetId];

  if (!widgetConfig) return null;

  const getCategoryColor = (category: string) => {
    const colors = {
      overview: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      projects: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      collaboration: 'bg-green-500/20 text-green-400 border-green-500/30',
      analytics: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      tools: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      notifications: 'bg-red-500/20 text-red-400 border-red-500/30',
      organizations: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      files: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      messages: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      settings: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[category as keyof typeof colors] || colors.overview;
  };

  const getSizeDescription = (size: string) => {
    const descriptions = {
      small: '1×1 - Compact widget',
      medium: '2×1 - Standard width',
      large: '2×2 - Large square',
      wide: '3×1 - Full width',
      tall: '1×3 - Extra height',
      'extra-large': '3×2 - Maximum size',
    };
    return descriptions[size as keyof typeof descriptions] || 'Custom size';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        'backdrop-blur-sm bg-white/5 border border-white/10 transition-all duration-200 hover:bg-white/10 hover:border-white/20',
        isAdded && 'opacity-50'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-white text-sm">{widgetConfig.title}</CardTitle>
                <Badge className={getCategoryColor(widgetConfig.category)}>
                  {widgetConfig.category}
                </Badge>
              </div>
              <CardDescription className="text-gray-400 text-xs line-clamp-2">
                {widgetConfig.description}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => onAdd(widgetId)}
              disabled={isAdded}
              className={cn(
                'ml-2 flex-shrink-0',
                isAdded
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              {isAdded ? (
                <>
                  <Star className="h-3 w-3 mr-1" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{getSizeDescription(widgetConfig.size)}</span>
            {widgetConfig.refreshInterval && (
              <span>Refreshes every {widgetConfig.refreshInterval}s</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function WidgetPalette({ className }: WidgetPaletteProps) {
  const { user } = useAuth();
  const { widgets, addWidget } = useWidgetLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);

  // Get available widgets based on user permissions
  const availableWidgets = useMemo(() => {
    if (!user) return [];
    return getWidgetsByPermission(user.userType);
  }, [user]);

  // Get available categories
  const categories = useMemo(() => {
    const allCategories = getAvailableCategories();
    // Filter categories based on available widgets
    return allCategories.filter(category =>
      availableWidgets.some(widget => widget.category === category)
    );
  }, [availableWidgets]);

  // Filter widgets based on search and category
  const filteredWidgets = useMemo(() => {
    let filtered = availableWidgets;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(widget => widget.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(widget =>
        widget.title.toLowerCase().includes(query) ||
        widget.description?.toLowerCase().includes(query) ||
        widget.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availableWidgets, selectedCategory, searchQuery]);

  // Handle widget addition
  const handleAddWidget = (widgetId: string) => {
    addWidget(widgetId);
  };

  // Check if widget is already added
  const isWidgetAdded = (widgetId: string) => {
    return widgets.includes(widgetId);
  };

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'flex items-center gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10',
            className
          )}
        >
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Widget Palette</span>
          <Sparkles className="h-3 w-3" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[480px] bg-slate-900/95 backdrop-blur-sm border-white/10"
      >
        <SheetHeader className="space-y-3">
          <SheetTitle className="text-white flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Widget Palette
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Add widgets to customize your dashboard. Drag and drop to rearrange them.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400"
            />
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Categories */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-3 bg-white/10">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
            </TabsList>

            {/* Additional category tabs if needed */}
            {categories.length > 3 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {categories.slice(3).map(category => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? "primary" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}

            <TabsContent value={selectedCategory} className="mt-4">
              {/* Widget Stats */}
              <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="text-sm text-gray-400">
                  {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''} available
                </div>
                <div className="text-sm text-gray-400">
                  {widgets.length} added to dashboard
                </div>
              </div>

              {/* Widget Grid */}
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredWidgets.map(widget => (
                    <WidgetPreview
                      key={widget.id}
                      widgetId={widget.id}
                      onAdd={handleAddWidget}
                      isAdded={isWidgetAdded(widget.id)}
                    />
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {filteredWidgets.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center p-8 text-center"
                  >
                    <Filter className="h-8 w-8 text-gray-500 mb-3" />
                    <h3 className="text-lg font-semibold text-white mb-2">No widgets found</h3>
                    <p className="text-gray-400 text-sm">
                      Try adjusting your search or category filter
                    </p>
                  </motion.div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-900 to-transparent">
          <div className="text-xs text-gray-500 text-center">
            Tip: Use the grip handle on widgets to drag and rearrange them
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}