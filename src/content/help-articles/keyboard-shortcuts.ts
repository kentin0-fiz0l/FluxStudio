import type { HelpArticle } from './index';

export const keyboardShortcuts: HelpArticle = {
  id: 'keyboard-shortcuts',
  slug: 'keyboard-shortcuts',
  title: 'Keyboard Shortcuts',
  summary: 'Master FluxStudio with keyboard shortcuts for faster workflows',
  category: 'Getting Started',
  categoryId: 'getting-started',
  keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keybindings', 'speed', 'productivity', 'quick'],
  relatedArticles: ['getting-started', 'settings-preferences', 'messaging-guide'],
  lastUpdated: '2025-02-01',
  readingTime: 3,
  content: `
# Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts. FluxStudio supports extensive keyboard navigation.

## Global Shortcuts

These work anywhere in FluxStudio:

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + K | Open command palette |
| Cmd/Ctrl + / | Search |
| Cmd/Ctrl + , | Open settings |
| Cmd/Ctrl + Shift + N | Open notifications |
| Cmd/Ctrl + P | Quick project switcher |
| Cmd/Ctrl + B | Toggle sidebar |
| Esc | Close modal/dialog |

## Navigation

Move around quickly:

| Shortcut | Action |
|----------|--------|
| G then P | Go to Projects |
| G then M | Go to Messages |
| G then S | Go to Settings |
| G then T | Go to Tools |
| G then H | Go to Help Center |

## Command Palette

Access anything with Cmd/Ctrl + K:

- Type to search commands
- Use arrow keys to navigate
- Press Enter to select
- Press Esc to close

### Common Commands
- "new project" - Create a project
- "settings" - Open settings
- "dark mode" - Toggle theme
- "logout" - Sign out

## Projects

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + N | New project |
| Cmd/Ctrl + E | Edit project |
| Cmd/Ctrl + F | Search in project |
| Cmd/Ctrl + Shift + F | Search all projects |
| Cmd/Ctrl + S | Save changes |

## Files

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + U | Upload files |
| Cmd/Ctrl + D | Download selected |
| Cmd/Ctrl + A | Select all |
| Delete | Delete selected |
| F2 | Rename selected |
| Enter | Open/preview file |

## Messaging

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + Shift + M | Open messages |
| Cmd/Ctrl + N | New conversation |
| Cmd/Ctrl + Enter | Send message |
| Up Arrow | Edit last message |
| @ | Mention someone |
| Esc | Close conversation |

## Text Editing

When typing in editors:

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + B | Bold |
| Cmd/Ctrl + I | Italic |
| Cmd/Ctrl + U | Underline |
| Cmd/Ctrl + K | Insert link |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |

## Tasks

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + T | New task |
| Cmd/Ctrl + Enter | Save task |
| Space | Toggle complete |
| Tab | Indent task |
| Shift + Tab | Outdent task |

## Selection

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + A | Select all |
| Cmd/Ctrl + Click | Toggle selection |
| Shift + Click | Range selection |
| Esc | Clear selection |

## View Controls

| Shortcut | Action |
|----------|--------|
| Cmd/Ctrl + + | Zoom in |
| Cmd/Ctrl + - | Zoom out |
| Cmd/Ctrl + 0 | Reset zoom |
| Cmd/Ctrl + F | Toggle fullscreen |

## Met Map Editor

Specialized shortcuts for the formation editor:

| Shortcut | Action |
|----------|--------|
| V | Select tool |
| D | Draw tool |
| M | Move tool |
| Space + Drag | Pan canvas |
| Scroll | Zoom in/out |
| Cmd/Ctrl + G | Group selected |
| Cmd/Ctrl + Shift + G | Ungroup |

## Tips

1. **Learn gradually** - Start with the most common shortcuts
2. **Use command palette** - Cmd/Ctrl + K helps you discover actions
3. **Check tooltips** - Hover over buttons to see shortcuts
4. **Customize** - Change shortcuts in Settings

## Viewing All Shortcuts

Press **?** anywhere to open the shortcuts reference panel.

## Customizing Shortcuts

1. Go to Settings
2. Click Keyboard Shortcuts
3. Find the action to customize
4. Record your new shortcut
5. Save changes

## Next Steps

Explore more features:
- Getting Started
- Settings & Preferences
- Messaging Guide
  `.trim(),
};
