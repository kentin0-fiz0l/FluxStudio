import { useState } from 'react';
import { BaseWidget } from './BaseWidget';
import { WidgetProps } from './types';
import { useTheme, THEME_VARIANTS, LAYOUT_DENSITIES } from '../../contexts/ThemeContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Palette,
  Layout,
  Monitor,
  Zap,
  RefreshCw,
} from 'lucide-react';

export function PersonalizationWidget({ config, onRefresh, onRemove }: WidgetProps) {
  const { settings, updateSettings, resetToDefaults } = useTheme();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState(settings.customAccentColor || '#3b82f6');

  const handleThemeChange = (variant: keyof typeof THEME_VARIANTS) => {
    updateSettings({ variant });
  };

  const handleDensityChange = (density: keyof typeof LAYOUT_DENSITIES) => {
    updateSettings({ layoutDensity: density });
  };

  const handleToggleAnimations = () => {
    updateSettings({ showAnimations: !settings.showAnimations });
  };

  const handleToggleSidebar = () => {
    updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed });
  };

  const handleColorApply = () => {
    updateSettings({ customAccentColor: tempColor });
    setShowColorPicker(false);
  };

  const handleColorReset = () => {
    updateSettings({ customAccentColor: undefined });
    setTempColor('#3b82f6');
    setShowColorPicker(false);
  };

  return (
    <BaseWidget
      config={config}
      onRefresh={onRefresh}
      onRemove={onRemove}
      className="min-h-96"
    >
      <div className="space-y-6">
        {/* Theme Variants */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-blue-400" aria-hidden="true" />
            <Label className="text-sm font-medium text-white">Theme</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEME_VARIANTS).map(([key, variant]) => (
              <Button
                key={key}
                variant={settings.variant === key ? "primary" : "outline"}
                size="sm"
                onClick={() => handleThemeChange(key as keyof typeof THEME_VARIANTS)}
                className={`justify-start p-3 h-auto ${
                  settings.variant === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: variant.colors.primary }}
                  />
                  <div>
                    <div className="font-medium text-xs">{variant.name}</div>
                    <div className="text-xs opacity-70">{variant.description}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Layout Density */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Layout className="h-4 w-4 text-purple-400" aria-hidden="true" />
            <Label className="text-sm font-medium text-white">Layout Density</Label>
          </div>
          <div className="flex gap-2">
            {Object.entries(LAYOUT_DENSITIES).map(([key, density]) => (
              <Button
                key={key}
                variant={settings.layoutDensity === key ? "primary" : "outline"}
                size="sm"
                onClick={() => handleDensityChange(key as keyof typeof LAYOUT_DENSITIES)}
                className={`flex-1 ${
                  settings.layoutDensity === key
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }`}
              >
                {density.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Accent Color */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-green-400" aria-hidden="true" />
            <Label className="text-sm font-medium text-white">Accent Color</Label>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: settings.customAccentColor || '#3b82f6' }}
              />
              Custom
            </Button>
            {settings.customAccentColor && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleColorReset}
                className="bg-white/5 hover:bg-white/10 text-gray-300"
              >
                Reset
              </Button>
            )}
          </div>

          {showColorPicker && (
            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex gap-2 items-center">
                <Input
                  type="color"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  className="w-12 h-8 p-1 border-white/20"
                />
                <Input
                  type="text"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 bg-white/10 border-white/20 text-white"
                />
                <Button
                  size="sm"
                  onClick={handleColorApply}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Settings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-yellow-400" aria-hidden="true" />
            <Label className="text-sm font-medium text-white">Quick Settings</Label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-sm text-gray-300">Collapse Sidebar</span>
              </div>
              <Button
                size="sm"
                variant={settings.sidebarCollapsed ? "primary" : "outline"}
                onClick={handleToggleSidebar}
                className={
                  settings.sidebarCollapsed
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }
              >
                {settings.sidebarCollapsed ? 'Collapsed' : 'Expanded'}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-400" aria-hidden="true" />
                <span className="text-sm text-gray-300">Animations</span>
              </div>
              <Button
                size="sm"
                variant={settings.showAnimations ? "primary" : "outline"}
                onClick={handleToggleAnimations}
                className={
                  settings.showAnimations
                    ? 'bg-green-500 text-white'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300'
                }
              >
                {settings.showAnimations ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </div>

        {/* Reset Options */}
        <div className="pt-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="w-full bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border-white/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </BaseWidget>
  );
}