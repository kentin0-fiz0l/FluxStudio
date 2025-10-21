# Sprint 12 Agent Coordination Matrix

**Purpose:** Define collaboration patterns and decision-making authority for Sprint 12 execution
**Vision Authority:** Creative Director (creative-director-flux-studio)
**Project Authority:** Product Manager (flux-studio-pm)
**Technical Authority:** Tech Lead (tech-lead-orchestrator)

---

## Decision-Making Authority Matrix

| Decision Type | Primary Owner | Consulted | Informed |
|--------------|---------------|-----------|----------|
| Vision alignment | Creative Director | PM, UX Reviewer | All agents |
| Timeline & scope | PM | Tech Lead, Creative Director | All agents |
| Technical architecture | Tech Lead | Code Reviewer, Security Reviewer | PM, Creative Director |
| UX implementation | UX Reviewer | Creative Director | Tech Lead, PM |
| Security approach | Security Reviewer | Tech Lead, UX Reviewer | Creative Director, PM |
| Code quality | Code Reviewer | Tech Lead | All agents |
| Testing strategy | Tech Lead | Code Reviewer, UX Reviewer | All agents |
| Deployment timing | PM | Tech Lead, Creative Director | All agents |

---

## Phase-by-Phase Coordination

### Phase 1: Storage Abstraction (Days 1-2)

**Lead:** Tech Lead
**Critical Path:** Database/file storage refactoring

#### Agent Responsibilities

**tech-lead-orchestrator:**
- Create StorageAdapter interface
- Implement FileStorageAdapter fallback
- Set up feature flags for gradual rollout
- Measure baseline performance metrics

**code-reviewer:**
- Review adapter interface design
- Validate test coverage (target: 90%+)
- Check error handling for storage failures
- Review rollback strategy

**security-reviewer:**
- Audit file upload security
- Review access control implementation
- Validate encryption at rest
- Check for path traversal vulnerabilities

**creative-director-flux-studio:**
- Monitor: File upload speed metrics
- Flag: Any degradation in designer workflow
- Approve: Go/no-go for Phase 2

**Coordination Pattern:**
```
Tech Lead implements → Code Reviewer approves code quality →
Security Reviewer approves security → Creative Director approves UX impact →
PM approves deployment
```

---

### Phase 2: JWT Token Refresh (Days 3-4)

**Lead:** Tech Lead + UX Reviewer
**Critical Path:** Transparent authentication

#### Agent Responsibilities

**tech-lead-orchestrator:**
- Implement token refresh endpoint
- Create activity detection system
- Build BroadcastChannel sync for multi-tab
- Set up monitoring for refresh failures

**ux-reviewer:**
- Design session timeout warning UI
- Test warning timing during creative workflows
- Validate "Stay Signed In" flow
- Test multi-device scenarios

**security-reviewer:**
- Review JWT security (signing, expiry, rotation)
- Audit refresh token storage
- Test for token theft scenarios
- Validate CSRF protection

**creative-director-flux-studio:**
- **CRITICAL:** Review activity-based expiry logic
- **CRITICAL:** Approve warning display timing
- Test: No interruptions during canvas editing
- Approve: Silent refresh implementation

**Coordination Pattern:**
```
Tech Lead + UX Reviewer co-design →
Creative Director approves flow impact →
Security Reviewer approves security →
Code Reviewer approves implementation →
PM approves deployment
```

#### Creative Director Veto Points
🛑 **Veto if:** Session warnings appear during active canvas editing
🛑 **Veto if:** Window reload disrupts unsaved work
🛑 **Veto if:** Multi-device workflow breaks

---

### Phase 3: Mobile Keyboard Handling (Days 5-6)

**Lead:** UX Reviewer
**Critical Path:** Mobile form completion

#### Agent Responsibilities

**ux-reviewer:**
- Implement KeyboardAwareForm component
- Create useKeyboardAwareScroll hook
- Design mobile input enhancements
- Test on iOS Safari + Android Chrome

**tech-lead-orchestrator:**
- Review performance of scroll detection
- Optimize viewport change listeners
- Ensure no memory leaks in hooks
- Test on low-end devices

**creative-director-flux-studio:**
- Test: Mobile annotation workflows
- Validate: Haptic feedback implementation
- Approve: Keyboard behavior on design canvas
- Test: Form completion during design review

**code-reviewer:**
- Review hook implementation
- Validate accessibility attributes
- Check for race conditions
- Review mobile-specific edge cases

**Coordination Pattern:**
```
UX Reviewer implements →
Creative Director tests creative workflows →
Tech Lead optimizes performance →
Code Reviewer approves code →
PM approves deployment
```

#### Success Gate
✅ Mobile form completion rate must reach 85% in beta testing before full rollout

---

### Phase 4: Skip Navigation & Focus (Days 7-8)

**Lead:** UX Reviewer
**Critical Path:** Accessibility compliance

#### Agent Responsibilities

**ux-reviewer:**
- Implement SkipNavigation component
- Create workflow-specific skip targets
- Design focus indicator system
- Test with screen readers (VoiceOver, NVDA)

**creative-director-flux-studio:**
- Approve: Focus ring visual design
- Validate: Skip links don't obscure canvas
- Test: Keyboard shortcuts in design workspace
- Design: Keyboard shortcut legend

**code-reviewer:**
- Review focus management logic
- Validate focus trap implementation
- Check for focus loss scenarios
- Review keyboard navigation order

**security-reviewer:**
- Audit: Focus indicators don't leak sensitive info
- Review: Skip links can't bypass auth
- Validate: Keyboard shortcuts secure

**Coordination Pattern:**
```
UX Reviewer implements →
Creative Director approves visual design →
Code Reviewer validates accessibility →
Security Reviewer approves →
PM approves deployment
```

#### Success Gate
✅ Lighthouse accessibility score must be 95+ before deployment

---

### Phase 5: Server Refactoring (Days 9-10)

**Lead:** Tech Lead
**Critical Path:** Zero-downtime deployment

#### Agent Responsibilities

**tech-lead-orchestrator:**
- Refactor server-auth.js (1,177 → 400 lines)
- Refactor server-messaging.js (934 → 350 lines)
- Extract middleware, validation, and utilities
- Set up parallel execution with feature flags

**code-reviewer:**
- Review: Extracted modules maintain API contracts
- Validate: Test coverage maintained (80%+)
- Check: Rollback scripts work correctly
- Review: Performance benchmarks improve

**security-reviewer:**
- Audit: Refactored auth maintains security
- Review: Session management unchanged
- Validate: No new attack surfaces introduced
- Check: Security headers still applied

**creative-director-flux-studio:**
- **CRITICAL:** Monitor real-time collaboration latency
- Test: Canvas save/load operations
- Validate: No user-visible disruptions
- Approve: Go/no-go for full rollout

**flux-studio-pm:**
- Coordinate: Deployment during low-usage window
- Prepare: User communication if needed
- Monitor: Support tickets for issues
- Decide: Rollback if problems detected

**Coordination Pattern:**
```
Tech Lead refactors → Code Reviewer validates quality →
Security Reviewer validates security →
Creative Director tests workflows →
PM approves deployment timing →
Deploy with instant rollback capability
```

#### Rollback Triggers (Automatic)
🚨 API response time > 500ms for 5 minutes
🚨 Error rate > 1% for 5 minutes
🚨 WebSocket connection failures > 5%
🚨 File upload failures > 2%

---

### Phase 6: XSS Protection (Throughout Sprint)

**Lead:** Security Reviewer
**Critical Path:** Continuous security validation

#### Agent Responsibilities

**security-reviewer:**
- Implement tiered DOMPurify sanitization
- Audit all user input surfaces
- Test XSS attack vectors
- Review link preview security

**ux-reviewer:**
- Test: Rich text formatting preserved
- Validate: User-friendly security messaging
- Design: External link preview UI
- Test: Comment formatting in design context

**creative-director-flux-studio:**
- Validate: Designers can share formatted feedback
- Test: Links to design references work
- Approve: Security messaging tone
- Ensure: No creative expression limited

**code-reviewer:**
- Review: Sanitization implementation
- Validate: No bypasses exist
- Check: Performance impact minimal
- Review: Error handling for malicious input

**Coordination Pattern:**
```
Security Reviewer implements →
UX Reviewer validates UX impact →
Creative Director tests creative workflows →
Code Reviewer approves implementation →
Continuous deployment throughout sprint
```

---

## Daily Coordination Rituals

### Daily Standup (Async, Mondays/Wednesdays/Fridays)

**Format:** Post updates in coordination channel

**Template:**
```
Agent: [Your Agent Name]
Yesterday: [Work completed]
Today: [Work planned]
Blockers: [Any issues]
Needs Review: [@mention relevant agents]
Vision Concerns: [@creative-director if applicable]
```

### Mid-Sprint Review (Day 5)

**Required Attendees:** All agents
**Led by:** Creative Director + PM

**Agenda:**
1. Vision alignment check (Creative Director)
2. Timeline status (PM)
3. Technical progress (Tech Lead)
4. UX validation (UX Reviewer)
5. Security status (Security Reviewer)
6. Code quality (Code Reviewer)
7. Go/no-go for Phase 5 (Consensus)

### End-of-Sprint Retrospective (Day 11)

**Required Attendees:** All agents
**Led by:** PM + Creative Director

**Agenda:**
1. Success metrics review
2. Vision alignment audit
3. What worked well
4. What needs improvement
5. Sprint 13 priorities

---

## Escalation Paths

### Vision Conflicts
```
Issue detected → UX Reviewer or Tech Lead raises to Creative Director →
Creative Director evaluates against vision brief →
Decision communicated to all agents →
Implementation adjusted or approved
```

### Technical Blockers
```
Blocker encountered → Tech Lead assesses impact →
If timeline-impacting: PM adjusts schedule →
If architecture-impacting: Tech Lead proposes solutions →
Creative Director validates UX impact →
PM makes final go/no-go decision
```

### Security Concerns
```
Vulnerability discovered → Security Reviewer assesses severity →
If critical: Immediate fix required, delay deployment →
If high: Fix before deployment →
If medium: Fix within sprint →
If low: Backlog for future sprint
```

### User Impact Issues
```
User feedback or metric concerns → Creative Director analyzes →
If violates vision: Immediate stop/redesign →
If minor: Note for iteration →
All agents notified of decision
```

---

## Communication Channels

### Vision Discussions
**Channel:** `#sprint12-vision`
**Participants:** Creative Director, PM, UX Reviewer
**Purpose:** Vision alignment, creative flow validation

### Technical Implementation
**Channel:** `#sprint12-tech`
**Participants:** Tech Lead, Code Reviewer, Security Reviewer
**Purpose:** Architecture, code quality, security

### Cross-Functional Coordination
**Channel:** `#sprint12-coordination`
**Participants:** All agents
**Purpose:** Daily updates, blockers, cross-phase dependencies

### Emergency Escalation
**Channel:** `#sprint12-urgent`
**Participants:** All agents
**Purpose:** Production issues, critical blockers, immediate decisions

---

## Conflict Resolution Framework

### Step 1: Identify Conflict Type

**Vision vs. Technical:**
- Creative Director and Tech Lead meet
- Explore technical solutions that serve vision
- If no solution: PM decides based on user impact

**Security vs. UX:**
- Security Reviewer and UX Reviewer meet
- Creative Director provides vision guidance
- Find solution that maintains both security and UX

**Timeline vs. Quality:**
- PM and Tech Lead meet
- Code Reviewer provides quality assessment
- PM decides: extend timeline or reduce scope (never reduce quality)

### Step 2: Structured Discussion

1. Each side presents their position (5 min each)
2. Creative Director frames vision context (5 min)
3. Collaborative solution brainstorm (15 min)
4. Decision with clear rationale (5 min)

### Step 3: Document Decision

All decisions documented in:
- Conflict description
- Options considered
- Final decision
- Rationale
- Impact on vision/timeline/security

### Step 4: Communicate & Execute

- Decision shared in coordination channel
- All agents acknowledge understanding
- Implementation proceeds with updated context

---

## Success Criteria Monitoring

### Shared Responsibility

**All agents monitor:**
- User feedback sentiment
- Support ticket trends
- Analytics metrics
- Performance benchmarks

**Daily check-in questions:**
1. Are we maintaining vision alignment?
2. Are we on track for timeline?
3. Are quality standards being met?
4. Are users experiencing any friction?

### Weekly Vision Alignment Check

**Led by:** Creative Director
**Every Monday:**

Review against vision brief:
- ✅ Collaborative momentum maintained?
- ✅ Unified process honored?
- ✅ Effortlessness achieved?
- ✅ Expressiveness preserved?
- ✅ Aliveness evident?

**If any ❌ detected:** Immediate coordination meeting to address

---

## Post-Deployment Monitoring (Days 11-14)

### Phase 7: Monitor & Iterate

**Lead:** PM + Creative Director
**Critical Path:** User impact validation

#### All Agent Responsibilities

**flux-studio-pm:**
- Monitor: Support tickets
- Track: Success metrics
- Coordinate: Hot fix deployment if needed
- Report: Sprint outcomes

**tech-lead-orchestrator:**
- Monitor: Performance metrics
- Track: Error rates
- Investigate: Any anomalies
- Prepare: Sprint 13 technical foundations

**creative-director-flux-studio:**
- Monitor: User feedback
- Analyze: Creative flow impact
- Identify: Vision enhancement opportunities
- Write: Sprint 13 vision brief

**ux-reviewer:**
- Monitor: Mobile completion rates
- Analyze: User behavior changes
- Identify: UX improvements for Sprint 13
- Document: Lessons learned

**security-reviewer:**
- Monitor: Security events
- Track: Authentication patterns
- Investigate: Anomalous behavior
- Prepare: Sprint 13 security priorities

**code-reviewer:**
- Monitor: Code quality metrics
- Track: Technical debt
- Review: Sprint 12 code health
- Identify: Refactoring opportunities

---

## Sprint 12 Coordination Success Criteria

### Process Success
- ✅ All phases completed on schedule
- ✅ Zero production rollbacks
- ✅ All agent reviews completed before deployment
- ✅ Clear communication maintained throughout

### Vision Success
- ✅ Creative Director approves all user-facing changes
- ✅ Zero creative flow disruptions reported
- ✅ Vision alignment maintained in all implementations
- ✅ User feedback indicates trust and performance gains

### Technical Success
- ✅ 80%+ test coverage maintained
- ✅ Performance metrics improve or stay constant
- ✅ Zero critical bugs in production
- ✅ Rollback capability proven in staging

### Collaboration Success
- ✅ All agents feel heard and respected
- ✅ Conflicts resolved constructively
- ✅ Knowledge shared across specializations
- ✅ Sprint 13 priorities clearly defined

---

## Final Sign-Off Process

### Day 10: Pre-Deployment Checklist

**Each agent completes their checklist:**

**Creative Director:**
- [ ] All UX changes tested in creative workflows
- [ ] Vision alignment confirmed for all features
- [ ] No creative flow interruptions detected
- [ ] User messaging reviewed and approved

**Tech Lead:**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met or exceeded
- [ ] Rollback scripts tested and ready
- [ ] Feature flags configured correctly

**UX Reviewer:**
- [ ] Mobile testing complete (iOS + Android)
- [ ] Accessibility audit passed (Lighthouse 95+)
- [ ] Screen reader testing complete
- [ ] Keyboard navigation verified

**Security Reviewer:**
- [ ] All XSS vectors tested and blocked
- [ ] JWT security validated
- [ ] Authentication flows tested
- [ ] No new vulnerabilities introduced

**Code Reviewer:**
- [ ] Code review complete for all changes
- [ ] Test coverage 80%+ maintained
- [ ] No code smells detected
- [ ] Documentation updated

**PM:**
- [ ] All stakeholders informed
- [ ] Deployment window scheduled
- [ ] Support team briefed
- [ ] Rollback plan documented

### Deployment Authorization

**Required:** ✅ from all agents before deployment

**If any ❌:** Deployment postponed until issue resolved

---

## Retrospective Template (Day 11)

### What Went Well
- [Agent-specific successes]
- [Cross-agent collaboration highlights]
- [Unexpected positive outcomes]

### What Could Be Improved
- [Process bottlenecks]
- [Communication gaps]
- [Technical challenges]

### Vision Insights
- [How sprint served creative vision]
- [Vision evolution learnings]
- [User feedback themes]

### Sprint 13 Priorities
- [Building on Sprint 12 foundation]
- [New creative features enabled]
- [Technical debt still to address]

---

## Document Control

**Version:** 1.0
**Created:** 2025-10-13
**Owner:** Creative Director + PM
**Review Cycle:** Daily updates during sprint
**Archival:** After Sprint 12 completion

---

*"Great collaboration happens when each agent understands not just their role, but how their work enables others to achieve the shared vision."*
