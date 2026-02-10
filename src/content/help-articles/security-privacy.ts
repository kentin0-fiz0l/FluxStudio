import type { HelpArticle } from './index';

export const securityPrivacy: HelpArticle = {
  id: 'security-privacy',
  slug: 'security-privacy',
  title: 'Security & Privacy',
  summary: 'Learn how FluxStudio protects your data and privacy',
  category: 'Security',
  categoryId: 'security',
  keywords: ['security', 'privacy', 'data', 'protection', 'encryption', 'gdpr', 'compliance'],
  relatedArticles: ['account-management', 'settings-preferences', 'file-management'],
  lastUpdated: '2025-02-01',
  readingTime: 6,
  content: `
# Security & Privacy

FluxStudio takes your security and privacy seriously. Here's how we protect your data.

## Data Protection

### Encryption

**In Transit**
- All connections use TLS 1.3
- HTTPS everywhere
- Secure WebSocket connections
- API requests encrypted

**At Rest**
- AES-256 encryption for files
- Encrypted database storage
- Secure key management
- Regular key rotation

### Data Centers
- SOC 2 compliant facilities
- Geographic redundancy
- 24/7 monitoring
- Physical security controls

### Backups
- Continuous backups
- 90-day retention
- Encrypted backup storage
- Regular recovery testing

## Account Security

### Passwords
Requirements:
- Minimum 8 characters
- Letters and numbers
- One uppercase letter
- One special character

Recommendations:
- Use a password manager
- Don't reuse passwords
- Change periodically
- Never share credentials

### Two-Factor Authentication
Extra layer of protection:
- TOTP-based (Google Authenticator, etc.)
- SMS backup option
- Backup codes for emergencies
- Required for admin accounts

### Session Management
- Automatic session timeout
- View active sessions
- Remote logout capability
- Suspicious login alerts

## Privacy Controls

### Your Data Rights
Under GDPR and similar laws:
- **Access**: Download your data anytime
- **Rectification**: Correct inaccurate data
- **Deletion**: Request account deletion
- **Portability**: Export in standard formats
- **Objection**: Opt out of processing

### Data We Collect
- Account information (name, email)
- Content you create
- Usage analytics (optional)
- Technical logs

### Data We Don't Collect
- Keystroke logging
- Screen recording
- Location tracking (unless enabled)
- Personal contacts

### Cookie Policy
We use cookies for:
- Authentication
- Preferences
- Analytics (with consent)
- Security features

Manage in Settings > Privacy.

## Access Controls

### Permission Model
**Organization Level**
- Owner: Full control
- Admin: Manage members and settings
- Member: Standard access

**Project Level**
- Admin: Full project control
- Editor: Create and edit
- Viewer: Read-only access

### Sharing Controls
- Set permissions per item
- Expiring share links
- Password-protected shares
- Audit who has access

### Audit Logs
Track all activity:
- Who accessed what
- Changes made
- Time and location
- Export for compliance

## Compliance

### Certifications
- SOC 2 Type II
- GDPR compliant
- CCPA compliant
- ISO 27001 (in progress)

### Legal Frameworks
We comply with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Health Insurance Portability (HIPAA ready)
- Payment Card Industry (PCI DSS)

### Data Processing
- EU data stays in EU
- US data stays in US
- Data Processing Agreements available
- Subprocessor list published

## Incident Response

### Security Monitoring
- 24/7 threat monitoring
- Automated alerts
- Regular penetration testing
- Vulnerability assessments

### Breach Notification
If a breach occurs:
- Investigate within 24 hours
- Notify affected users within 72 hours
- Provide mitigation steps
- Full transparency

### Reporting Security Issues
Found a vulnerability?
- Email security@fluxstudio.art
- Include details to reproduce
- We respond within 24 hours
- Bug bounty program available

## Best Practices for Users

### Account Security
1. Enable two-factor authentication
2. Use strong, unique passwords
3. Review active sessions regularly
4. Log out on shared devices

### Data Protection
1. Set appropriate permissions
2. Review who has access
3. Use expiring share links
4. Regularly audit collaborators

### Safe Collaboration
1. Verify invite recipients
2. Remove inactive users
3. Use organization controls
4. Train team on security

## Enterprise Features

### Single Sign-On (SSO)
- SAML 2.0 support
- OIDC support
- Major providers supported
- Automatic provisioning

### Advanced Security
- Custom session policies
- IP allowlisting
- Domain verification
- Advanced audit logs

### Compliance Tools
- Data retention policies
- Legal hold
- eDiscovery export
- Custom DPA

## Privacy Settings

### Managing Privacy
1. Go to Settings > Privacy
2. Review data collection
3. Adjust analytics preferences
4. Set visibility options

### Communication Preferences
Control what we send:
- Product updates
- Security alerts (required)
- Marketing (optional)
- Research participation

## Contact Us

**Security Issues**
security@fluxstudio.art

**Privacy Questions**
privacy@fluxstudio.art

**General Support**
support@fluxstudio.art

## Resources

- Privacy Policy: fluxstudio.art/privacy
- Terms of Service: fluxstudio.art/terms
- Security Whitepaper: Available on request
- Compliance Documentation: Enterprise only
  `.trim(),
};
