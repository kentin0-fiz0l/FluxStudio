# FluxStudio Redesign - Quick Reference Guide

**For Developers** 👨‍💻

---

## 🎨 Using the Design System

### Import Components

```tsx
// Templates
import { DashboardLayout } from '@/components/templates';

// Molecules
import { ProjectCard, FileCard, UserCard, ChatMessage } from '@/components/molecules';

// Atoms
import { Button, Card, Badge, Dialog, Input } from '@/components/ui';

// Design Tokens
import { colors, typography, spacing, shadows } from '@/tokens';
```

---

## 📄 Page Template

### Standard Page Structure

```tsx
import { DashboardLayout } from '@/components/templates';
import { Button, Card } from '@/components/ui';
import { useOptionalAuth } from '@/hooks/useAuth';

export function MyPage() {
  const { user, logout } = useOptionalAuth();

  return (
    <DashboardLayout
      user={user}
      breadcrumbs={[{ label: 'My Page' }]}
      onLogout={logout}
      showSearch
    >
      <div className="p-6 space-y-6">
        {/* Page content here */}
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Page Title
          </h1>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

---

## 🧩 Component Quick Reference

### Button

```tsx
// Variants
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button loading>Loading...</Button>
<Button disabled>Disabled</Button>

// With Icons
<Button>
  <Icon className="w-4 h-4 mr-2" />
  Click Me
</Button>
```

### Card

```tsx
// Basic
<Card className="p-6">Content</Card>

// Variants
<Card variant="default">Default</Card>
<Card variant="outline">Outline</Card>
<Card variant="ghost">Ghost</Card>
```

### Badge

```tsx
// Variants
<Badge variant="default">Default</Badge>
<Badge variant="solidPrimary">Primary</Badge>
<Badge variant="solidSuccess">Success</Badge>
<Badge variant="solidError">Error</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

### Dialog

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <Dialog.Content title="Dialog Title">
    <div className="space-y-4">
      {/* Dialog content */}
      <Button onClick={() => setOpen(false)}>
        Close
      </Button>
    </div>
  </Dialog.Content>
</Dialog>
```

### ProjectCard

```tsx
<ProjectCard
  project={{
    id: '1',
    name: 'Project Name',
    description: 'Description',
    status: 'active',
    progress: 65,
    dueDate: new Date(),
    teamSize: 8,
    tags: ['Design', 'Development']
  }}
  variant="default" // or "compact"
  showProgress
  showTeam
  showTags
  showActions
  onView={() => navigate(`/projects/${project.id}`)}
  onEdit={() => handleEdit(project)}
/>
```

### FileCard

```tsx
<FileCard
  file={{
    id: '1',
    name: 'document.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    size: 1024000,
    modifiedAt: new Date(),
    shared: true,
    starred: false
  }}
  view="grid" // or "list"
  showActions
  onClick={() => handleOpen(file)}
/>
```

### UserCard

```tsx
<UserCard
  user={{
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar.jpg',
    role: 'admin',
    status: 'active'
  }}
  showRole
  showStatus
  showEmail
  onView={() => navigate(`/users/${user.id}`)}
  onMessage={() => startChat(user)}
  actions={[
    {
      label: 'Edit Role',
      onClick: () => editRole(user)
    },
    {
      label: 'Remove',
      onClick: () => removeUser(user),
      variant: 'danger'
    }
  ]}
/>
```

### ChatMessage

```tsx
<ChatMessage
  message={{
    id: '1',
    text: 'Hello!',
    sender: {
      id: 'user1',
      name: 'Jane Doe',
      initials: 'JD'
    },
    timestamp: new Date(),
    isCurrentUser: false,
    read: true,
    attachments: [{
      id: 'att1',
      name: 'file.pdf',
      size: 1024,
      type: 'application/pdf',
      url: '/files/file.pdf'
    }]
  }}
  showAvatar
  showSenderName
  showTimestamp
  showReadReceipt
  onAttachmentClick={(att) => download(att)}
/>
```

---

## 🎨 Design Tokens

### Colors

```tsx
import { colors } from '@/tokens';

// Primary
colors.primary[50]   // Lightest
colors.primary[600]  // Main
colors.primary[900]  // Darkest

// Secondary, Accent, Success, Warning, Error, Info
colors.secondary[600]
colors.accent[600]
colors.success[600]
colors.warning[600]
colors.error[600]
colors.info[600]

// Neutral
colors.neutral[50]   // Almost white
colors.neutral[900]  // Almost black
```

### Typography

```tsx
import { typography } from '@/tokens';

// Font Families
typography.fontFamily.display  // Orbitron (headings)
typography.fontFamily.sans     // Lexend (body)
typography.fontFamily.mono     // SF Mono (code)

// Font Sizes
typography.fontSize.xs    // 12px
typography.fontSize.sm    // 14px
typography.fontSize.base  // 16px
typography.fontSize.lg    // 18px
typography.fontSize.xl    // 20px
typography.fontSize['2xl'] // 24px

// Font Weights
typography.fontWeight.normal  // 400
typography.fontWeight.medium  // 500
typography.fontWeight.semibold // 600
typography.fontWeight.bold    // 700
```

### Spacing

```tsx
import { spacing } from '@/tokens';

// Base spacing (4px grid)
spacing[0]   // 0
spacing[1]   // 4px
spacing[2]   // 8px
spacing[4]   // 16px
spacing[6]   // 24px
spacing[8]   // 32px
spacing[12]  // 48px
```

---

## 📱 Responsive Design

### Breakpoints

```tsx
// Tailwind breakpoints
sm:  // 640px
md:  // 768px
lg:  // 1024px
xl:  // 1280px
2xl: // 1536px

// Example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Responsive grid */}
</div>
```

### Mobile-First Approach

```tsx
// Mobile first (default)
<div className="p-4 md:p-6 lg:p-8">
  {/* Padding increases on larger screens */}
</div>

// Hide on mobile
<div className="hidden md:block">
  {/* Only visible on md and above */}
</div>

// Stack on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">
  {/* Vertical on mobile, horizontal on desktop */}
</div>
```

---

## 🔧 Common Patterns

### State Management

```tsx
import { useState, useMemo } from 'react';

function MyComponent() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use useMemo for filtered data
  const filteredItems = useMemo(() => {
    return items
      .filter(item => filter === 'all' || item.status === filter)
      .filter(item => item.name.includes(searchTerm));
  }, [items, filter, searchTerm]);

  return (
    <div>
      {/* Render filteredItems */}
    </div>
  );
}
```

### Loading States

```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <div>{/* Render data */}</div>;
}
```

### Empty States

```tsx
{items.length === 0 && (
  <Card className="p-12 text-center">
    <Icon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
      No Items Found
    </h3>
    <p className="text-neutral-600 mb-4">
      Get started by creating your first item
    </p>
    <Button onClick={onCreate}>
      <PlusIcon className="w-4 h-4 mr-2" />
      Create Item
    </Button>
  </Card>
)}
```

### Form Handling

```tsx
function MyForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit form
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Name
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            name: e.target.value
          }))}
          placeholder="Enter name"
        />
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## 🎯 Best Practices

### Component Usage

✅ **DO**:
- Use DashboardLayout for all authenticated pages
- Use design tokens instead of hardcoded values
- Use semantic variants (success, error, warning)
- Use proper TypeScript types
- Use useMemo for expensive computations
- Keep components focused and single-purpose

❌ **DON'T**:
- Mix old and new components on same page
- Use inline styles (use Tailwind classes)
- Hardcode colors or spacing
- Create custom modals (use Dialog component)
- Bypass the component API

### Styling

✅ **DO**:
- Use Tailwind utility classes
- Use design tokens from `@/tokens`
- Follow spacing grid (4px base)
- Use semantic color names
- Keep consistent spacing

❌ **DON'T**:
- Use arbitrary values unless necessary
- Mix CSS modules with Tailwind
- Use !important unless unavoidable
- Create one-off styles

### Accessibility

✅ **DO**:
- Use semantic HTML elements
- Add proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast
- Test with screen readers

❌ **DON'T**:
- Use divs for buttons
- Forget focus states
- Use color alone to convey info
- Block keyboard access

---

## 📚 File Structure

```
src/
├── components/
│   ├── ui/              # Atoms (Button, Card, etc.)
│   ├── molecules/       # Molecules (UserCard, etc.)
│   ├── organisms/       # Organisms (Sidebar, TopBar)
│   └── templates/       # Templates (DashboardLayout)
├── pages/
│   ├── Home.tsx         # Redesigned home
│   ├── ProjectsNew.tsx  # Redesigned projects
│   ├── FileNew.tsx      # Redesigned files
│   ├── MessagesNew.tsx  # Redesigned messages
│   ├── TeamNew.tsx      # Redesigned team
│   └── OrganizationNew.tsx # Redesigned org
├── tokens/              # Design tokens
├── hooks/               # Custom hooks
└── utils/               # Utilities
```

---

## 🔍 Debugging Tips

### Component Not Rendering?

1. Check TypeScript errors: `npm run build`
2. Check console for errors
3. Verify imports are correct
4. Check component props match interface

### Styles Not Applying?

1. Check Tailwind class names
2. Verify tailwind.config.js includes file
3. Check for specificity issues
4. Use browser DevTools to inspect

### Build Errors?

1. Clear cache: `rm -rf .vite node_modules/.cache`
2. Reinstall: `npm install`
3. Check TypeScript: `npx tsc --noEmit`
4. Check imports and exports

---

## 📞 Need Help?

- **Documentation**: `/docs/design-system/`
- **Examples**: Check existing pages in `/src/pages/*New.tsx`
- **Issues**: Check console and TypeScript errors first
- **Component API**: Check type definitions in component files

---

**Quick Reference Version**: 1.0
**Last Updated**: January 2025

🚀 **Happy coding with Flux Design Language!**
