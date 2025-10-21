# Sprint 13, Day 6: Admin Dashboard UI (Frontend)

**Date:** 2025-10-18 (Planned)
**Status:** 📋 Ready to Begin
**Prerequisites:** ✅ Day 1-5 Complete and Deployed

---

## Objectives

1. **Admin Dashboard Layout** - Responsive admin interface with navigation
2. **Admin Login Page** - Secure authentication for admin users
3. **Security Dashboard** - Real-time security metrics with charts
4. **Blocked IPs Interface** - Manage blocked/whitelisted IPs
5. **Token Management Interface** - Search, view, and revoke tokens
6. **Event Timeline** - Visual timeline of security events
7. **Performance Dashboard** - Real-time performance monitoring
8. **Real-time Updates** - WebSocket integration for live data
9. **Production Deployment** - Deploy UI and test

---

## Architecture Overview

### Technology Stack
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts or Chart.js
- **State Management:** React Query for API calls
- **Real-time:** WebSocket for live updates
- **Routing:** React Router v6

### Component Structure
```
src/admin/
├── AdminApp.tsx              # Main admin app entry
├── AdminLayout.tsx           # Dashboard layout with navigation
├── pages/
│   ├── AdminLogin.tsx        # Login page
│   ├── Dashboard.tsx         # Main security dashboard
│   ├── BlockedIPs.tsx        # IP management
│   ├── Tokens.tsx            # Token management
│   ├── Events.tsx            # Security events
│   ├── Performance.tsx       # Performance metrics
│   └── Settings.tsx          # Admin settings
├── components/
│   ├── charts/
│   │   ├── SecurityChart.tsx # Security metrics chart
│   │   ├── PerformanceChart.tsx # Performance chart
│   │   └── TimelineChart.tsx # Event timeline
│   ├── tables/
│   │   ├── IPTable.tsx       # Blocked IPs table
│   │   ├── TokenTable.tsx    # Tokens table
│   │   └── EventTable.tsx    # Events table
│   ├── modals/
│   │   ├── IPModal.tsx       # IP details/actions
│   │   ├── TokenModal.tsx    # Token details/actions
│   │   └── EventModal.tsx    # Event details
│   └── ui/
│       ├── StatCard.tsx      # Dashboard stat cards
│       ├── AlertBanner.tsx   # Alert notifications
│       └── DataTable.tsx     # Reusable data table
└── hooks/
    ├── useAdminAuth.ts       # Admin authentication
    ├── useBlockedIPs.ts      # Blocked IPs API
    ├── useTokens.ts          # Tokens API
    ├── useEvents.ts          # Events API
    ├── usePerformance.ts     # Performance API
    └── useWebSocket.ts       # Real-time updates
```

---

## Task Breakdown

### Task 1: Admin Dashboard Layout (1 hour)

**1.1 Create AdminLayout Component**
- Top navigation bar with logo and user menu
- Sidebar navigation with icons
- Main content area
- Responsive design (desktop, tablet, mobile)
- Dark mode support

**Layout Structure:**
```tsx
<AdminLayout>
  <Sidebar>
    - Dashboard
    - Blocked IPs
    - Tokens
    - Security Events
    - Performance
    - Settings
    - Logout
  </Sidebar>

  <MainContent>
    <TopBar>
      - Breadcrumbs
      - Search
      - Notifications
      - User Menu
    </TopBar>

    <Content>
      {children}
    </Content>
  </MainContent>
</AdminLayout>
```

**Features:**
- Collapsible sidebar
- Active route highlighting
- Notification badge on alerts
- User info dropdown
- Mobile hamburger menu

### Task 2: Admin Login Page (1 hour)

**2.1 Create AdminLogin Component**
- Email + password form
- JWT token storage
- Remember me checkbox
- Error handling
- Redirect to dashboard on success

**Login Flow:**
```
1. User enters email/password
2. POST /api/auth/login with credentials
3. Check if user has admin role
4. Store JWT token in localStorage
5. Redirect to /admin/dashboard
```

**Features:**
- Form validation
- Loading states
- Error messages
- Password visibility toggle
- Auto-focus on load

### Task 3: Security Dashboard (2 hours)

**3.1 Main Dashboard View**
- Overview statistics cards
- Security alerts panel
- Recent events list
- Charts for trends

**Stat Cards:**
```tsx
<StatCard
  title="Blocked IPs"
  value="127"
  change="+12"
  trend="up"
  icon={ShieldIcon}
  color="red"
/>

<StatCard
  title="Active Tokens"
  value="843"
  change="-23"
  trend="down"
  icon={KeyIcon}
  color="green"
/>

<StatCard
  title="Security Events"
  value="2,341"
  change="+156"
  trend="up"
  icon={AlertIcon}
  color="yellow"
/>

<StatCard
  title="System Health"
  value="Healthy"
  status="online"
  icon={HeartIcon}
  color="green"
/>
```

**3.2 Security Alerts Panel**
- Recent high/critical severity events
- Auto-refresh every 30 seconds
- Click to view details
- Filter by severity

**3.3 Security Trends Chart**
- Events over time (last 24 hours)
- By severity (critical, high, medium, low)
- Interactive tooltip on hover
- Zoom/pan controls

**Chart Library:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

<LineChart data={eventStats}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="timestamp" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="critical" stroke="#ef4444" />
  <Line type="monotone" dataKey="high" stroke="#f59e0b" />
  <Line type="monotone" dataKey="medium" stroke="#3b82f6" />
  <Line type="monotone" dataKey="low" stroke="#10b981" />
</LineChart>
```

### Task 4: Blocked IPs Interface (2 hours)

**4.1 Blocked IPs Table**
- Paginated table with sorting
- Filter by score range, level
- Search by IP address
- Actions: View details, Unblock, Whitelist

**Table Columns:**
- IP Address
- Reputation Score (color-coded)
- Level (badge)
- Ban Reason
- Last Seen
- Actions

**4.2 IP Details Modal**
- Full reputation history
- Related security events
- Charts showing score changes
- Actions: Unblock, Whitelist, Adjust Score

**4.3 IP Actions**
```tsx
// Unblock IP
const handleUnblock = async (ip: string, reason: string) => {
  await fetch(`/api/admin/security/blocked-ips/${ip}/unblock`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason })
  });

  refetch(); // Refresh table
  showToast('IP unblocked successfully');
};

// Whitelist IP
const handleWhitelist = async (ip: string, reason: string, duration: number) => {
  await fetch(`/api/admin/security/blocked-ips/${ip}/whitelist`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason, duration })
  });

  refetch();
  showToast('IP whitelisted successfully');
};
```

**4.4 Bulk Actions**
- Select multiple IPs
- Bulk unblock
- Bulk whitelist
- Export to CSV

### Task 5: Token Management Interface (1.5 hours)

**5.1 Tokens Table**
- Search by user, email, token ID
- Filter by status (active, expired, revoked)
- Sort by creation date, expiry
- Actions: View details, Revoke

**Table Columns:**
- Token ID (truncated)
- User Email
- Status (badge)
- Created At
- Expires At
- Last Used
- Actions

**5.2 Token Details Modal**
- Full token lifecycle
- Associated session info
- Usage count and age
- Revocation history if applicable

**5.3 Token Actions**
```tsx
// Revoke token
const handleRevoke = async (tokenId: string, reason: string, revokeAll: boolean) => {
  await fetch(`/api/admin/tokens/${tokenId}/revoke`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason, revokeAll })
  });

  refetch();
  showToast('Token revoked successfully');
};
```

**5.4 Token Analytics**
- Chart showing token lifecycle
- Created vs revoked vs expired
- Top users by token count
- Time series graph

### Task 6: Event Timeline (2 hours)

**6.1 Event Timeline View**
- Chronological list of security events
- Visual timeline with markers
- Color-coded by severity
- Expandable event details

**Timeline Component:**
```tsx
<Timeline>
  {events.map(event => (
    <TimelineItem
      key={event.id}
      timestamp={event.timestamp}
      severity={event.severity}
      title={event.title}
      description={event.description}
      icon={getIconForEventType(event.type)}
      onClick={() => openEventDetails(event)}
    />
  ))}
</Timeline>
```

**6.2 Event Filters**
- Filter by: Type, Severity, User, IP, Date range
- Sort by: Timestamp, Severity
- Search: Full-text search in event details

**6.3 Event Details Modal**
- Full event information
- Related events (same IP/user)
- Resolution actions taken
- Admin notes (add/edit)

**6.4 Event Export**
- Export filtered events to CSV or JSON
- Email report to admin
- Schedule recurring reports

### Task 7: Performance Dashboard (1.5 hours)

**7.1 Performance Metrics**
- Current system metrics
- Request latency (p50, p95, p99)
- Error rate
- Memory/CPU usage
- Redis latency

**Metrics Display:**
```tsx
<MetricsGrid>
  <MetricCard
    title="Request Latency (P95)"
    value="95ms"
    target="< 100ms"
    status="good"
    chart={<MiniChart data={latencyHistory} />}
  />

  <MetricCard
    title="Error Rate"
    value="0.12%"
    target="< 0.1%"
    status="warning"
    chart={<MiniChart data={errorHistory} />}
  />

  <MetricCard
    title="Memory Usage"
    value="94 MB"
    target="< 200 MB"
    status="good"
    chart={<MiniChart data={memoryHistory} />}
  />

  <MetricCard
    title="CPU Usage"
    value="12%"
    target="< 50%"
    status="good"
    chart={<MiniChart data={cpuHistory} />}
  />
</MetricsGrid>
```

**7.2 Performance Charts**
- Request latency over time
- Throughput (requests/second)
- Error rate over time
- System resources over time

**7.3 Endpoint Performance**
- Table of endpoints with stats
- Sort by: Request count, Latency, Error rate
- Identify slow endpoints

**7.4 Performance Alerts**
- List of recent performance alerts
- Threshold violations
- Auto-refresh

### Task 8: Real-time Updates (1 hour)

**8.1 WebSocket Connection**
- Connect to performance WebSocket on mount
- Receive real-time metrics
- Update charts and stats automatically
- Reconnect on disconnect

**WebSocket Hook:**
```tsx
const useWebSocket = (url: string) => {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setData(data);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => {
        // Reconnect logic
      }, 5000);
    };

    return () => ws.close();
  }, [url]);

  return { data, connected };
};
```

**8.2 Live Notifications**
- Toast notifications for new events
- Badge on navigation for unread alerts
- Sound notification for critical events
- Desktop notifications (optional)

**8.3 Auto-refresh**
- Refresh tables every 30 seconds
- Refresh charts every 60 seconds
- Pause auto-refresh when user is interacting
- Resume when idle

### Task 9: Settings Page (0.5 hours)

**9.1 Admin Settings**
- Cleanup schedule configuration
- Alert thresholds
- Notification preferences
- Export data
- System health check

**Settings Form:**
```tsx
<SettingsForm>
  <Section title="Cleanup Schedule">
    <Toggle label="Enable automatic cleanup" />
    <Select label="Interval" options={['daily', 'weekly', 'monthly']} />
    <TimeInput label="Time" />
  </Section>

  <Section title="Alert Thresholds">
    <NumberInput label="Latency threshold (ms)" />
    <NumberInput label="Error rate threshold (%)" />
    <NumberInput label="Memory threshold (MB)" />
    <NumberInput label="CPU threshold (%)" />
  </Section>

  <Section title="Notifications">
    <Checkbox label="Email alerts" />
    <Checkbox label="Desktop notifications" />
    <Checkbox label="Sound notifications" />
  </Section>
</SettingsForm>
```

---

## Implementation Details

### Admin Authentication Hook

```tsx
// hooks/useAdminAuth.ts
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  roleLevel: number;
}

export const useAdminAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin token exists
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Verify token with backend
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!data.token) {
        throw new Error('No token received');
      }

      // Decode JWT to check role
      const payload = JSON.parse(atob(data.token.split('.')[1]));

      if (!['admin', 'moderator', 'analyst'].includes(payload.role)) {
        throw new Error('Not an admin user');
      }

      localStorage.setItem('adminToken', data.token);
      setUser({
        id: payload.id,
        email: payload.email,
        role: payload.role,
        roleLevel: getRoleLevel(payload.role)
      });

      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    setUser(null);
    navigate('/admin/login');
  };

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({
          id: payload.id,
          email: payload.email,
          role: payload.role,
          roleLevel: getRoleLevel(payload.role)
        });
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('adminToken');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLevel = (role: string) => {
    const levels = { admin: 3, moderator: 2, analyst: 1 };
    return levels[role] || 0;
  };

  return { user, loading, login, logout };
};
```

### Blocked IPs Hook

```tsx
// hooks/useBlockedIPs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useBlockedIPs = (page = 1, perPage = 50, filters = {}) => {
  const queryClient = useQueryClient();
  const token = localStorage.getItem('adminToken');

  const { data, isLoading, error } = useQuery({
    queryKey: ['blockedIPs', page, perPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        ...filters
      });

      const response = await fetch(`/api/admin/security/blocked-ips?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch blocked IPs');
      return response.json();
    },
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const unblockIP = useMutation({
    mutationFn: async ({ ip, reason }: { ip: string; reason: string }) => {
      const response = await fetch(`/api/admin/security/blocked-ips/${ip}/unblock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) throw new Error('Failed to unblock IP');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    }
  });

  const whitelistIP = useMutation({
    mutationFn: async ({ ip, reason, duration }: { ip: string; reason: string; duration: number }) => {
      const response = await fetch(`/api/admin/security/blocked-ips/${ip}/whitelist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, duration })
      });

      if (!response.ok) throw new Error('Failed to whitelist IP');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedIPs'] });
    }
  });

  return {
    ips: data?.ips || [],
    pagination: data?.pagination,
    isLoading,
    error,
    unblockIP,
    whitelistIP
  };
};
```

---

## Styling Guidelines

### Tailwind Config
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          primary: '#3b82f6',
          secondary: '#6366f1',
          success: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          dark: '#1f2937',
          light: '#f3f4f6'
        }
      }
    }
  },
  plugins: []
};
```

### Component Styling
- Use Tailwind utility classes
- Consistent spacing (4, 8, 16, 24px)
- Rounded corners (rounded-lg)
- Shadows for elevation (shadow-md, shadow-lg)
- Hover states for all interactive elements
- Focus states for accessibility

---

## Testing Strategy

### Component Testing
1. Unit tests for hooks
2. Integration tests for forms
3. E2E tests for critical flows (login, IP management)

### Manual Testing Checklist
- ✅ Login with admin credentials
- ✅ Navigate between all pages
- ✅ Filter and sort tables
- ✅ Unblock IP
- ✅ Whitelist IP
- ✅ Revoke token
- ✅ View event details
- ✅ Export data
- ✅ Real-time updates
- ✅ Responsive on mobile
- ✅ Dark mode (if implemented)

---

## Deployment Checklist

### Prerequisites
- ✅ Admin API endpoints integrated into server-auth.js
- ✅ Admin user tokens created
- ✅ Performance metrics middleware integrated

### Build Steps
```bash
# Build admin UI
cd /Users/kentino/FluxStudio
npm run build:admin

# Deploy to server
scp -r dist/admin root@167.172.208.61:/var/www/fluxstudio/public/admin

# Configure nginx (if needed)
ssh root@167.172.208.61 "systemctl reload nginx"
```

### Post-Deployment
1. Verify admin login works
2. Test all API endpoints from UI
3. Check WebSocket connection
4. Verify real-time updates
5. Test on mobile device

---

## Timeline

- **Hour 1:** Admin layout and navigation
- **Hour 2:** Admin login page
- **Hour 3-4:** Security dashboard with charts
- **Hour 5-6:** Blocked IPs interface
- **Hour 7-8.5:** Token management interface
- **Hour 8.5-10.5:** Event timeline
- **Hour 10.5-12:** Performance dashboard
- **Hour 12-13:** Real-time updates
- **Hour 13-13.5:** Settings page
- **Hour 13.5-14:** Testing and bug fixes
- **Hour 14-15:** Deployment

**Total:** 15 hours

---

## Success Metrics

### Day 6 Completion Criteria
- ✅ All admin pages implemented
- ✅ All CRUD operations working
- ✅ Charts displaying data correctly
- ✅ Real-time updates functional
- ✅ Responsive design on all screen sizes
- ✅ Production deployment successful
- ✅ No console errors
- ✅ Accessibility standards met (WCAG AA)

### User Experience Metrics
- Login time: < 2 seconds
- Page load time: < 1 second
- Table filter response: < 500ms
- Chart render time: < 1 second
- Real-time update delay: < 2 seconds

---

**Ready to begin:** Starting implementation now
