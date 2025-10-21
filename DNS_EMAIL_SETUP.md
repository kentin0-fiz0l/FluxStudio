# FluxStudio DNS & Email Configuration Guide

## 🌐 Domain Setup for fluxstudio.art

### Step 1: DigitalOcean Droplet Setup

1. **Create a Droplet** (if you haven't already):
   - Ubuntu 22.04 LTS
   - Basic plan ($6/month minimum)
   - Choose a datacenter close to your target audience
   - Add your SSH key

2. **Note your Droplet's IP address**
   - Example: `165.232.123.456`

### Step 2: DNS Configuration

Add these DNS records at your domain registrar (where you bought fluxstudio.art):

#### Website Records:
```
Type    Name    Value                   TTL
A       @       YOUR_DROPLET_IP         3600
A       www     YOUR_DROPLET_IP         3600
CNAME   *       fluxstudio.art          3600
```

#### Email Setup Option 1: Email Forwarding (Simplest)
Many domain registrars offer free email forwarding. This forwards hello@fluxstudio.art to your personal email.

**At your domain registrar:**
1. Go to Email Forwarding settings
2. Add: hello@fluxstudio.art → your.personal@email.com
3. Add: kentino@fluxstudio.art → your.personal@email.com

#### Email Setup Option 2: Professional Email with Namecheap Private Email
```
Type    Name    Value                           Priority    TTL
MX      @       mx1.privateemail.com           10          3600
MX      @       mx2.privateemail.com           20          3600
TXT     @       v=spf1 include:spf.privateemail.com ~all     3600
```

#### Email Setup Option 3: Professional Email with Google Workspace
```
Type    Name    Value                   Priority    TTL
MX      @       aspmx.l.google.com     1           3600
MX      @       alt1.aspmx.l.google.com 5          3600
MX      @       alt2.aspmx.l.google.com 5          3600
MX      @       alt3.aspmx.l.google.com 10         3600
MX      @       alt4.aspmx.l.google.com 10         3600
TXT     @       v=spf1 include:_spf.google.com ~all   3600
```

#### Email Setup Option 4: DigitalOcean + Postfix (Free but Complex)
```
Type    Name    Value                   Priority    TTL
MX      @       mail.fluxstudio.art    10          3600
A       mail    YOUR_DROPLET_IP        -           3600
TXT     @       v=spf1 a mx ip4:YOUR_DROPLET_IP ~all  3600
```

### Step 3: Deployment Process

1. **Make deployment script executable:**
```bash
chmod +x deploy-to-digitalocean.sh
chmod +x setup-droplet.sh
```

2. **First-time droplet setup (run once):**
```bash
# Copy setup script to droplet
scp setup-droplet.sh root@YOUR_DROPLET_IP:/tmp/

# SSH into droplet and run setup
ssh root@YOUR_DROPLET_IP
chmod +x /tmp/setup-droplet.sh
/tmp/setup-droplet.sh
```

3. **Deploy the application:**
```bash
./deploy-to-digitalocean.sh
```

### Step 4: Email Service Recommendations

#### For Simple Email Forwarding (Free):
- **Cloudflare Email Routing** (if using Cloudflare for DNS)
- **ImprovMX** (free email forwarding service)
- **ForwardEmail.net** (open-source email forwarding)

#### For Professional Email ($3-6/month):
- **Namecheap Private Email** ($11.88/year)
- **Zoho Mail** (Free for 1 user, $12/year for more)
- **ProtonMail** ($48/year, privacy-focused)

#### For Full Business Suite ($6-12/month):
- **Google Workspace** ($6/month per user)
- **Microsoft 365** ($6/month per user)

### Step 5: Setting Up Email Forwarding with ImprovMX (Free Option)

1. Go to https://improvmx.com
2. Add your domain: fluxstudio.art
3. Set up aliases:
   - hello@fluxstudio.art → your.email@gmail.com
   - kentino@fluxstudio.art → your.email@gmail.com
   - bookings@fluxstudio.art → your.email@gmail.com

4. Add these DNS records:
```
Type    Name    Value                   Priority    TTL
MX      @       mx1.improvmx.com       10          3600
MX      @       mx2.improvmx.com       20          3600
TXT     @       v=spf1 include:spf.improvmx.com ~all   3600
```

### Step 6: Verify Setup

1. **Check DNS propagation:**
   - Visit: https://www.whatsmydns.net
   - Enter: fluxstudio.art
   - Verify A records point to your droplet

2. **Test email:**
   - Send a test email to hello@fluxstudio.art
   - Should forward to your personal email

3. **Check website:**
   - Visit: https://fluxstudio.art
   - Should show your FluxStudio website

### Step 7: SSL Certificate (Automatic)

The deployment script automatically sets up SSL using Let's Encrypt. If you need to manually set it up:

```bash
ssh root@YOUR_DROPLET_IP
certbot --nginx -d fluxstudio.art -d www.fluxstudio.art
```

## 🚀 Quick Start Commands

```bash
# 1. Set your droplet IP
export DROPLET_IP="YOUR_DROPLET_IP_HERE"

# 2. Initial setup (run once)
scp setup-droplet.sh root@$DROPLET_IP:/tmp/
ssh root@$DROPLET_IP "bash /tmp/setup-droplet.sh"

# 3. Deploy application
./deploy-to-digitalocean.sh

# 4. Check deployment
curl https://fluxstudio.art
```

## 📧 Email Testing

Once DNS propagates (5-30 minutes):

1. Send test email to hello@fluxstudio.art
2. Check your forwarding destination
3. Reply to test sending works (if using a service that supports it)

## 🔍 Troubleshooting

### Website not loading:
- Check DNS propagation: `nslookup fluxstudio.art`
- Check Nginx: `ssh root@$DROPLET_IP "systemctl status nginx"`
- Check PM2: `ssh root@$DROPLET_IP "pm2 status"`

### Email not working:
- Check MX records: `nslookup -type=mx fluxstudio.art`
- Verify SPF record: `nslookup -type=txt fluxstudio.art`
- Check forwarding service dashboard

## 📱 Contact Support

- **DigitalOcean Support**: https://www.digitalocean.com/support
- **Domain Registrar Support**: Check where you bought the domain
- **Email Service Support**: Check your chosen email provider

---

**Note**: DNS changes can take 5-30 minutes to propagate globally. Email forwarding typically starts working within 5-10 minutes after DNS updates.