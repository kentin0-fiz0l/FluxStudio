# 🚀 Quick Start - Collaborative Editor Demo

## Try It Now (3 steps)

### 1. Start the Demo Server
```bash
cd /Users/kentino/Projects/Active/FluxStudio
node serve-demo.js
```

You should see:
```
🚀 Collaborative Editor Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server running at http://localhost:3030/

📝 Instructions:
1. Open the URL in multiple browser windows
2. Start typing in one window
3. Watch the text appear in real-time in other windows!
```

### 2. Open Multiple Browser Windows
```bash
# macOS
open http://localhost:3030/
open http://localhost:3030/

# Linux
xdg-open http://localhost:3030/
xdg-open http://localhost:3030/

# Or manually open in your browser
```

### 3. Start Collaborating!
- Type in one window
- Watch text appear instantly in the other
- See user badges update when multiple users connect
- Try typing in both windows simultaneously - no conflicts!

## What You'll See

### The Interface
```
┌─────────────────────────────────────────────┐
│ ✨ FluxStudio Collaborative Editor          │
│ Real-time collaborative editing powered     │
│ by Yjs CRDT                    [●Connected] │
├─────────────────────────────────────────────┤
│ Room: demo-abc123  [Copy Link]   👤👤 2 users│
├─────────────────────────────────────────────┤
│ 🎯 Try it out!                              │
│ 1. Open this page in multiple windows       │
│ 2. Start typing...                          │
├─────────────────────────────────────────────┤
│                                             │
│ [Your text editor - start typing here!]    │
│                                             │
│                                             │
├─────────────────────────────────────────────┤
│ 📊 0 messages  ⚡ 15ms  Powered by FluxStudio│
└─────────────────────────────────────────────┘
```

### Features to Try

✅ **Real-Time Sync**
- Type in window 1 → Appears instantly in window 2

✅ **Multi-User**
- Open 3+ windows → All stay in sync

✅ **Conflict-Free**
- Type in multiple windows simultaneously → No conflicts!

✅ **Share Room**
- Click "Copy Link" → Share with teammates

✅ **User Presence**
- Watch user badges update as people join/leave

## Production Demo

After deployment, the demo will be available at:
```
https://fluxstudio.art/demo-collaborative-editor.html
```

Just open that URL in multiple windows and start collaborating!

## Troubleshooting

### Port Already in Use
```bash
# If port 3030 is busy, edit serve-demo.js
# Change: const PORT = 3030;
# To:     const PORT = 3031; (or any available port)
```

### Can't Connect to Collaboration Server
```bash
# Check if collaboration service is healthy
curl https://fluxstudio.art/collab/health

# Expected response:
{
  "status": "healthy",
  "service": "collaboration-server"
}
```

### Changes Not Syncing
1. Check browser console for errors (F12)
2. Verify both windows are in the same room
3. Look for green "Connected" status indicator
4. Try refreshing both windows

## Next Steps

- 📖 Read `DEMO_COLLABORATIVE_EDITOR.md` for full documentation
- 🧪 Run tests: `node test-collaboration.js`
- 🎨 Customize the UI in `public/demo-collaborative-editor.html`
- 🚀 Deploy to production and share with your team!

---

**Questions?** Open an issue or check the docs!
