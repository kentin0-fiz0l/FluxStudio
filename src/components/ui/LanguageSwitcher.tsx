/**
 * Language Switcher Component
 * @file src/components/ui/LanguageSwitcher.tsx
 *
 * Allows users to switch between supported languages
 */

// React import not needed with JSX transform
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  type LanguageCode,
} from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export function LanguageSwitcher({
  variant = 'default',
  className,
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation('common');
  const currentLang = i18n.language;

  const currentLanguage = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === currentLang
  ) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = async (code: LanguageCode) => {
    await changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'md'}
          className={cn('gap-2', className)}
          aria-label={t('language.select')}
        >
          {variant === 'icon' ? (
            <Globe className="h-4 w-4" aria-hidden="true" />
          ) : variant === 'compact' ? (
            <>
              <span className="text-lg">{currentLanguage.flag}</span>
              <span className="sr-only">{currentLanguage.name}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{currentLanguage.flag}</span>
              <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {SUPPORTED_LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={cn(
              'flex items-center gap-3 cursor-pointer',
              currentLang === language.code && 'bg-accent'
            )}
          >
            <span className="text-lg">{language.flag}</span>
            <div className="flex flex-col flex-1">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">
                {language.name}
              </span>
            </div>
            {currentLang === language.code && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
