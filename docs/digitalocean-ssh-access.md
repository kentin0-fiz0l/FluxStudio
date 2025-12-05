# DigitalOcean SSH Access Guide

This guide covers SSH access for DigitalOcean infrastructure. Note the key distinction:

- **App Platform** (used for MetMap production): No direct SSH access
- **Droplets** (VMs): Full SSH access for debugging, experiments, and custom setups

## App Platform vs Droplets

| Feature | App Platform | Droplet |
|---------|--------------|---------|
| SSH Access | No | Yes |
| Management | Fully managed | Self-managed |
| Scaling | Automatic | Manual |
| Use Case | Production apps | Debugging, experiments |
| Cost | Pay per usage | Fixed monthly |

**MetMap's canonical production deployment is App Platform.** Droplets are optional for:
- Deep debugging issues that can't be reproduced locally
- Running sidecar tools (monitoring, profiling)
- Custom experiments before promoting to App Platform
- Learning/testing infrastructure changes

## SSH Setup for Droplets

If you need a Droplet for debugging or experiments, follow these steps:

### 1. Generate an SSH Key

Create a dedicated key for DigitalOcean (don't reuse existing keys):

```bash
ssh-keygen -t ed25519 -C "metmap-do-ssh" -f ~/.ssh/metmap_do
```

When prompted:
- **Passphrase**: Recommended for security (or leave empty for convenience)

This creates two files:
- `~/.ssh/metmap_do` — Private key (never share this)
- `~/.ssh/metmap_do.pub` — Public key (upload to DigitalOcean)

### 2. Add Public Key to DigitalOcean

1. Log into [DigitalOcean](https://cloud.digitalocean.com/)
2. Go to **Settings** → **Security** → **SSH Keys**
3. Click **Add SSH Key**
4. Paste the contents of your public key:
   ```bash
   cat ~/.ssh/metmap_do.pub
   ```
5. Name it something recognizable (e.g., "MetMap Debug Key")
6. Click **Add SSH Key**

### 3. Create a Droplet

1. Go to **Droplets** → **Create Droplet**
2. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic, $6/mo (1 GB RAM) is sufficient for debugging
   - **Region**: Same as App Platform (e.g., NYC)
   - **Authentication**: Select your SSH key from the list
3. Click **Create Droplet**
4. Note the IP address when it's ready

### 4. Connect via SSH

```bash
ssh -i ~/.ssh/metmap_do root@YOUR_DROPLET_IP
```

First connection will ask to verify the host fingerprint—type `yes`.

### 5. (Optional) Run MetMap on Droplet

If you want to run MetMap on the Droplet for debugging:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version

# Clone the repo
git clone https://github.com/kentin0-fiz0l/FluxStudio.git
cd FluxStudio/metmap

# Install dependencies and build
npm ci
npm run build

# Run (will be on port 3000)
npm start
```

To access from your browser, you'll need to:
1. Open port 3000 in the Droplet's firewall (DO dashboard → Networking → Firewalls)
2. Visit `http://YOUR_DROPLET_IP:3000`

For production-like setup, use a reverse proxy (nginx) and SSL (Let's Encrypt).

## SSH Config (Optional)

Add to `~/.ssh/config` for easier connections:

```
Host metmap-do
    HostName YOUR_DROPLET_IP
    User root
    IdentityFile ~/.ssh/metmap_do
```

Then connect with just:

```bash
ssh metmap-do
```

## Security Notes

- **Never commit private keys** to the repo
- **Rotate keys** if you suspect they're compromised
- **Use passphrases** on keys for sensitive environments
- **Destroy Droplets** when not in use to avoid charges and reduce attack surface

## When to Use Droplets vs App Platform

| Scenario | Use |
|----------|-----|
| Production deployment | App Platform |
| Quick debugging | Local dev |
| Can't reproduce locally | Droplet |
| Load testing | Droplet |
| Custom monitoring setup | Droplet |
| Learning DO infrastructure | Droplet |

Remember: App Platform is the canonical MetMap deployment. Droplets are supplementary for debugging and experiments only.
