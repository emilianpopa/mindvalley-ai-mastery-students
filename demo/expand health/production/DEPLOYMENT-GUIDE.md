# ExpandHealth AI Copilot - Production Deployment Guide

**Subdomain:** `copilot.expandhealth.ai`
**Technology:** Node.js server with Gemini 2.5 Flash AI
**Purpose:** Production-ready treatment plan generation tool for ExpandHealth practitioners

---

## Table of Contents

1. [Chosen Subdomain & Rationale](#chosen-subdomain--rationale)
2. [Deployment Options Overview](#deployment-options-overview)
3. [Recommended Deployment: Simple VPS](#recommended-deployment-simple-vps)
4. [Alternative: Serverless Deployment](#alternative-serverless-deployment)
5. [Alternative: Google Cloud Run](#alternative-google-cloud-run)
6. [DNS Configuration](#dns-configuration)
7. [SSL Certificate Setup](#ssl-certificate-setup)
8. [Environment Variables](#environment-variables)
9. [Security Best Practices](#security-best-practices)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Backup & Recovery](#backup--recovery)

---

## Chosen Subdomain & Rationale

**Selected Subdomain:** `copilot.expandhealth.ai`

### Why This Choice?

1. **Clear Purpose**: Immediately communicates this is an AI assistant tool for practitioners
2. **Professional**: Sounds enterprise-grade and trustworthy for medical context
3. **Intuitive**: Easy for doctors and staff to remember and type
4. **Scalable**: Allows for future expansion (e.g., `patient.expandhealth.ai` for patient-facing tools)
5. **Industry Standard**: Follows conventions like GitHub Copilot, Microsoft Copilot
6. **Memorable**: Short, descriptive, professional

### Alternatives Considered

- `ai.expandhealth.ai` - Too generic, unclear purpose
- `protocols.expandhealth.ai` - Limits perceived functionality
- `plans.expandhealth.ai` - Sounds administrative, not AI-powered
- `doctor.expandhealth.ai` - Excludes other staff members

---

## Deployment Options Overview

### Option A: Simple VPS (RECOMMENDED)
**Best for:** Most businesses, full control, predictable costs

- **Providers:** DigitalOcean, AWS EC2, Linode, Vultr, Hetzner
- **Pros:** Simple, full control, predictable pricing, easy debugging
- **Cons:** Requires basic server management
- **Cost:** $10-20/month for small instance
- **Recommended for:** ExpandHealth use case

### Option B: Serverless (Vercel/Netlify/AWS Lambda)
**Best for:** Variable traffic, minimal ops

- **Providers:** Vercel, Netlify, AWS Lambda + API Gateway
- **Pros:** Auto-scaling, minimal ops, pay-per-use
- **Cons:** Cold starts, complex for Node.js with file uploads
- **Cost:** ~$0-50/month depending on usage
- **Challenges:** PDF upload handling, file system for KB

### Option C: Google Cloud Run
**Best for:** Google Cloud ecosystem users

- **Pros:** Serverless + containerized, auto-scaling, easy integration with Gemini
- **Cons:** Requires Docker knowledge
- **Cost:** ~$5-30/month with generous free tier
- **Good fit:** Already using GCP

---

## Recommended Deployment: Simple VPS

This guide focuses on **Option A** as the best fit for ExpandHealth.

### Step 1: Server Setup

#### 1.1 Choose a VPS Provider

**Recommended: DigitalOcean ($12/month)**

- Create account at https://www.digitalocean.com
- Select "Create Droplet"
- Choose:
  - **OS:** Ubuntu 22.04 LTS
  - **Plan:** Basic ($12/month - 2GB RAM, 1 vCPU)
  - **Datacenter:** Closest to your users (e.g., EU if Cape Town users)
  - **SSH Key:** Add your public SSH key for secure access

**Alternative: AWS Lightsail ($10/month)**

- Similar setup, slightly cheaper
- https://lightsail.aws.amazon.com

**Alternative: Hetzner ($5/month - Europe)**

- Best value in Europe
- https://www.hetzner.com/cloud

#### 1.2 Initial Server Configuration

Once your server is created, note the IP address (e.g., `159.89.123.45`)

**SSH into your server:**

```bash
ssh root@159.89.123.45
```

**Update system packages:**

```bash
apt update && apt upgrade -y
```

**Create a non-root user (recommended):**

```bash
adduser expandhealth
usermod -aG sudo expandhealth
su - expandhealth
```

**Install Node.js 18+:**

```bash
# Install Node.js using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x or higher
```

**Install PM2 (process manager):**

```bash
sudo npm install -g pm2
```

**Install Git:**

```bash
sudo apt install -y git
```

### Step 2: Deploy Application

#### 2.1 Upload Production Files

**Option A: Automated Deployment Script**

On your local machine (from the `production/` directory):

```bash
# Set your server details
export DEPLOY_HOST=159.89.123.45
export DEPLOY_USER=expandhealth

# Run deployment script
./deploy.sh
```

The script will:
1. Package your application
2. Upload to server
3. Install dependencies
4. Start with PM2
5. Verify deployment

**Option B: Manual Deployment**

```bash
# On your local machine
cd production/
tar -czf deploy.tar.gz \
    server.js dashboard.html kb-manager.js \
    kb-config.json kb-content/ package.json .env

# Upload to server
scp deploy.tar.gz expandhealth@159.89.123.45:/home/expandhealth/

# SSH into server
ssh expandhealth@159.89.123.45

# Extract and setup
mkdir -p /var/www/expandhealth-copilot
cd /var/www/expandhealth-copilot
tar -xzf ~/deploy.tar.gz
npm install --production

# Start application
./start-production.sh
```

#### 2.2 Configure Environment Variables

Edit `.env` file on server:

```bash
nano .env
```

Fill in your API keys:

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_actual_gemini_api_key
CLAUDE_API_KEY=your_actual_claude_api_key (optional)
AI_MODEL=gemini
MAX_OUTPUT_TOKENS=8192
ALLOWED_ORIGINS=https://copilot.expandhealth.ai
RATE_LIMIT_MAX=100
```

Save and restart:

```bash
pm2 restart expandhealth-copilot
```

### Step 3: Install and Configure Nginx (Reverse Proxy)

#### 3.1 Install Nginx

```bash
sudo apt install -y nginx
```

#### 3.2 Configure Nginx for ExpandHealth Copilot

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/expandhealth-copilot
```

Add configuration:

```nginx
server {
    listen 80;
    server_name copilot.expandhealth.ai;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Client body size limit (for PDF uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for AI generation (can take 30+ seconds)
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

Save and enable configuration:

```bash
sudo ln -s /etc/nginx/sites-available/expandhealth-copilot /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

#### 3.3 Configure Firewall

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### Step 4: Setup SSL Certificate (Let's Encrypt)

#### 4.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### 4.2 Obtain SSL Certificate

**BEFORE running this, ensure DNS is configured** (see DNS Configuration section below)

```bash
sudo certbot --nginx -d copilot.expandhealth.ai
```

Follow prompts:
- Enter email for renewal notifications
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

Certbot will:
- Obtain certificate
- Automatically configure Nginx for HTTPS
- Set up auto-renewal

#### 4.3 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

If successful, certificates will auto-renew every 60 days.

### Step 5: Configure PM2 for Auto-Start

Ensure application starts on server reboot:

```bash
pm2 startup systemd
# Copy and run the command it outputs

pm2 save
```

### Step 6: Verify Deployment

1. **Health Check:**
   ```bash
   curl https://copilot.expandhealth.ai/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Dashboard Access:**
   Visit: https://copilot.expandhealth.ai

3. **Test Treatment Plan Generation:**
   - Click "Load John Smith Example"
   - Click "Generate Treatment Plan"
   - Verify output appears

---

## Alternative: Serverless Deployment

### Vercel Deployment

**Note:** Requires adaptation for file uploads and knowledge base

#### Preparation

1. Convert to serverless functions
2. Move KB to cloud storage (S3, Vercel Blob)
3. Use Vercel's file upload handling

#### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

**Challenges:**
- PDF uploads need multipart/form-data handling
- KB files need cloud storage
- Cold starts (first request slow)

**Verdict:** Not ideal for this use case due to PDF uploads and local KB

---

## Alternative: Google Cloud Run

### Benefits

- Serverless but containerized
- Better for file uploads
- Tight integration with Gemini API

### Setup Steps

1. **Create Dockerfile:**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
```

2. **Build and Deploy:**

```bash
# Build container
gcloud builds submit --tag gcr.io/YOUR_PROJECT/expandhealth-copilot

# Deploy to Cloud Run
gcloud run deploy expandhealth-copilot \
  --image gcr.io/YOUR_PROJECT/expandhealth-copilot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key
```

3. **Map custom domain in Cloud Run console**

**Cost:** ~$5-20/month depending on usage

---

## DNS Configuration

### Step 1: Access DNS Provider

Go to your domain registrar or DNS provider where `expandhealth.ai` is managed.

Common providers:
- Cloudflare (recommended for free SSL/CDN)
- GoDaddy
- Namecheap
- Google Domains
- Route53 (AWS)

### Step 2: Add DNS Record

Add an **A record** for the subdomain:

| Type | Name     | Value (IP Address) | TTL  |
|------|----------|-------------------|------|
| A    | copilot  | 159.89.123.45     | Auto |

**Example for Cloudflare:**

1. Login to Cloudflare
2. Select `expandhealth.ai` domain
3. Go to DNS section
4. Click "Add record"
5. Type: A
6. Name: copilot
7. IPv4 address: Your server IP
8. Proxy status: Proxied (orange cloud) - recommended for DDoS protection
9. Click Save

### Step 3: Verify DNS Propagation

DNS changes can take 5 minutes to 48 hours to propagate.

Check with:

```bash
# Check DNS resolution
nslookup copilot.expandhealth.ai

# Or
dig copilot.expandhealth.ai
```

Should return your server IP address.

### Optional: CloudFlare CDN & DDoS Protection

If using Cloudflare:

1. Enable "Proxied" mode (orange cloud)
2. Automatic DDoS protection
3. Free SSL certificate
4. CDN caching for static assets

**Cloudflare Settings:**
- SSL/TLS Mode: Full (strict)
- Always Use HTTPS: On
- Automatic HTTPS Rewrites: On
- Minimum TLS Version: 1.2

---

## SSL Certificate Setup

### Option 1: Let's Encrypt (Automated)

**Already covered in VPS deployment Step 4.**

Free, automated, auto-renewing. Best for most use cases.

### Option 2: Cloudflare SSL (If using Cloudflare DNS)

Cloudflare provides free SSL automatically when DNS is proxied.

**Setup:**

1. In Cloudflare dashboard → SSL/TLS
2. Set SSL mode to "Full (strict)"
3. Install Cloudflare Origin Certificate on server

**Generate Origin Certificate:**

1. Cloudflare dashboard → SSL/TLS → Origin Server
2. Create Certificate
3. Copy certificate and private key
4. Save to server:
   - `/etc/ssl/certs/expandhealth-origin.pem`
   - `/etc/ssl/private/expandhealth-origin-key.pem`

**Update Nginx config:**

```nginx
server {
    listen 443 ssl http2;
    server_name copilot.expandhealth.ai;

    ssl_certificate /etc/ssl/certs/expandhealth-origin.pem;
    ssl_certificate_key /etc/ssl/private/expandhealth-origin-key.pem;

    # ... rest of configuration
}
```

### Option 3: Commercial SSL Certificate

Purchase from providers like DigiCert, Sectigo if organizational requirements demand.

---

## Environment Variables

### Required Variables

```env
# Environment
NODE_ENV=production

# Server
PORT=3000

# API Keys (REQUIRED)
GEMINI_API_KEY=AIzaSyC... (your actual key)
CLAUDE_API_KEY=sk-ant-... (optional, for Claude model)

# AI Configuration
AI_MODEL=gemini
MAX_OUTPUT_TOKENS=8192

# Security
ALLOWED_ORIGINS=https://copilot.expandhealth.ai,https://www.expandhealth.ai
RATE_LIMIT_MAX=100
```

### How to Set Environment Variables

**Method 1: `.env` file (recommended for VPS)**

Create `.env` in application directory:

```bash
cd /var/www/expandhealth-copilot
nano .env
# Paste configuration
# Save and exit
```

**Method 2: PM2 Ecosystem File**

Edit `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'expandhealth-copilot',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      GEMINI_API_KEY: 'your_key',
      // ... other variables
    }
  }]
};
```

**Method 3: Cloud Provider Environment Variables**

For Vercel, Cloud Run, etc., set in platform dashboard.

---

## Security Best Practices

### 1. API Key Security

- **Never commit API keys to Git**
- Store in environment variables only
- Rotate keys regularly (every 90 days)
- Use separate keys for dev/staging/production
- Monitor API usage for unusual activity

### 2. Server Security

**Basic Hardening:**

```bash
# Keep system updated
sudo apt update && sudo apt upgrade -y

# Configure fail2ban (prevents brute-force)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (use SSH keys only)
sudo systemctl restart sshd

# Install and configure UFW firewall (done in Step 3.3)
```

### 3. Application Security

**Already implemented in `server.js`:**

- Rate limiting (100 requests per 15 min per IP)
- CORS restriction to allowed origins
- Input validation on file uploads (10MB limit, PDF only)
- Secure headers (X-Frame-Options, etc. - set in Nginx)
- Request timeouts (prevents hanging requests)
- Graceful shutdown handling

**Additional Recommendations:**

- Implement authentication (basic auth or OAuth) if needed
- Add IP whitelisting for admin endpoints
- Monitor logs for suspicious activity
- Regular security audits

### 4. HTTPS Enforcement

**Nginx forces HTTPS** (configured automatically by Certbot)

All HTTP requests automatically redirect to HTTPS.

### 5. Monitoring & Alerting

**Setup basic monitoring:**

```bash
# Install monitoring agent (example: Netdata)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Or use cloud provider monitoring:
# - AWS CloudWatch
# - DigitalOcean Monitoring
# - Google Cloud Monitoring
```

**Monitor these metrics:**
- Server CPU/RAM usage
- Application uptime
- Request rate
- Error rate
- API usage (Gemini quota)

**Alerting:**

Set up alerts for:
- Server down
- High error rate (>5%)
- High CPU/memory (>80%)
- SSL certificate expiring soon

---

## Monitoring & Maintenance

### Daily Checks

**PM2 Status:**

```bash
pm2 status
pm2 monit  # Real-time monitoring
```

**Application Logs:**

```bash
pm2 logs expandhealth-copilot --lines 100
```

**Nginx Logs:**

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Weekly Checks

**System Updates:**

```bash
sudo apt update && sudo apt upgrade -y
```

**Disk Space:**

```bash
df -h
# Ensure / has >20% free
```

**Backup Knowledge Base:**

```bash
cd /var/www/expandhealth-copilot
./backup-kb.sh
```

### Monthly Checks

**SSL Certificate Renewal:**

```bash
sudo certbot renew
# Should auto-renew, but good to verify
```

**API Usage Review:**

Check Gemini API dashboard for usage patterns.

**Security Updates:**

Review server security patches.

### Useful PM2 Commands

```bash
pm2 status                          # Show app status
pm2 logs expandhealth-copilot      # View logs
pm2 restart expandhealth-copilot   # Restart app
pm2 stop expandhealth-copilot      # Stop app
pm2 start expandhealth-copilot     # Start app
pm2 delete expandhealth-copilot    # Remove from PM2
pm2 monit                          # Resource monitor
pm2 save                           # Save process list
pm2 resurrect                      # Restore saved processes
```

---

## Troubleshooting

### Application Won't Start

**Check logs:**

```bash
pm2 logs expandhealth-copilot --err
```

**Common issues:**

1. **Missing .env file**
   ```bash
   cd /var/www/expandhealth-copilot
   ls -la .env  # Should exist
   cp .env.template .env  # If missing
   # Edit and add API keys
   ```

2. **Missing dependencies**
   ```bash
   npm install --production
   ```

3. **Port already in use**
   ```bash
   lsof -i :3000
   # Kill conflicting process or change PORT in .env
   ```

4. **Invalid API key**
   - Check GEMINI_API_KEY in .env
   - Test key at https://aistudio.google.com/apikey
   - Regenerate if needed

### "502 Bad Gateway" Error

**Meaning:** Nginx can't reach Node.js application

**Check if application is running:**

```bash
pm2 status
curl http://localhost:3000/health
```

**If not running, start it:**

```bash
pm2 start ecosystem.config.js
```

**Check Nginx configuration:**

```bash
sudo nginx -t
sudo systemctl restart nginx
```

### "Connection Timeout" When Generating Plans

**Cause:** AI generation can take 30-60 seconds

**Fixes:**

1. **Increase Nginx timeouts** (already configured in guide):
   ```nginx
   proxy_read_timeout 120s;
   ```

2. **Increase CloudFlare timeout** (if using):
   - Upgrade to Pro plan for 100s timeout
   - Or use direct IP access for testing

3. **Check application timeout:**
   - Default is 120s in server.js
   - Increase if needed

### PDF Upload Fails

**Check:**

1. **File size limit:**
   - Nginx: `client_max_body_size 10M;`
   - Application: 10MB limit in formidable config

2. **Permissions:**
   ```bash
   ls -la /var/www/expandhealth-copilot
   # Should be owned by application user
   ```

3. **Disk space:**
   ```bash
   df -h
   ```

### DNS Not Resolving

**Verify DNS record:**

```bash
nslookup copilot.expandhealth.ai
dig copilot.expandhealth.ai
```

**Wait for propagation:** Can take up to 48 hours

**Flush local DNS cache:**

```bash
# macOS
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns
```

### SSL Certificate Issues

**Check certificate status:**

```bash
sudo certbot certificates
```

**Manually renew:**

```bash
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

**Test HTTPS:**

```bash
curl https://copilot.expandhealth.ai/health
```

---

## Backup & Recovery

### What to Backup

1. **Knowledge Base** (critical):
   - `kb-config.json`
   - `kb-content/` directory

2. **Environment Configuration**:
   - `.env` file

3. **Application Code** (optional, in Git):
   - All `.js` files
   - `dashboard.html`

### Automated Backups

**Setup daily KB backup cron job:**

```bash
crontab -e
```

Add line:

```cron
0 2 * * * cd /var/www/expandhealth-copilot && ./backup-kb.sh
```

This backs up KB daily at 2 AM.

### Manual Backup

```bash
cd /var/www/expandhealth-copilot
./backup-kb.sh
```

Backups are stored in `./backups/` directory.

**Copy backups off-server:**

```bash
# From your local machine
scp expandhealth@159.89.123.45:/var/www/expandhealth-copilot/backups/kb_backup_*.tar.gz ~/backups/
```

### Restore from Backup

```bash
cd /var/www/expandhealth-copilot

# Extract backup
tar -xzf backups/kb_backup_YYYYMMDD_HHMMSS.tar.gz

# Restart application
pm2 restart expandhealth-copilot
```

### Disaster Recovery Plan

**If server fails completely:**

1. Provision new server (same steps as initial deployment)
2. Restore KB from backup
3. Restore `.env` file (store securely offline)
4. Deploy application code
5. Update DNS if IP changed
6. Verify functionality

**Recovery Time:** ~30-60 minutes

---

## Next Steps After Deployment

### 1. Test Thoroughly

- Generate treatment plans for various patient types
- Upload multiple PDFs
- Test on different browsers and devices
- Verify mobile responsiveness

### 2. Train Staff

- Create user guide for ExpandHealth staff
- Demonstrate workflow:
  1. Enter patient info
  2. Upload blood test PDFs
  3. Generate plan
  4. Review and download
  5. Share with patient

### 3. Monitor Usage

- Track number of plans generated per day
- Monitor API costs (Gemini is free for first 1,500/day)
- Gather user feedback
- Identify areas for improvement

### 4. Plan Enhancements

**Short-term:**
- Add user authentication (login)
- Save plan history
- Email plans directly to patients
- Track plan effectiveness

**Long-term:**
- Multi-language support
- Integration with patient records system
- Mobile app
- AI model fine-tuning on ExpandHealth outcomes

---

## Support & Contact

**Deployment Issues:**
- Check troubleshooting section above
- Review application logs: `pm2 logs`
- Review nginx logs: `/var/log/nginx/error.log`

**API Issues:**
- Gemini API Status: https://status.cloud.google.com/
- Check quota: https://aistudio.google.com/

**For ExpandHealth Team:**
- Document common issues and solutions
- Keep deployment documentation updated
- Maintain changelog of updates

---

## Appendix: Quick Reference Commands

### Common Operations

```bash
# Restart application
pm2 restart expandhealth-copilot

# View logs
pm2 logs expandhealth-copilot

# Backup KB
./backup-kb.sh

# Update application (after code changes)
git pull  # If using git
pm2 restart expandhealth-copilot

# Check server health
curl https://copilot.expandhealth.ai/health

# Monitor resources
pm2 monit
htop

# Restart nginx
sudo systemctl restart nginx

# Renew SSL
sudo certbot renew
```

### Emergency Procedures

**Application unresponsive:**

```bash
pm2 delete expandhealth-copilot
pm2 start ecosystem.config.js
```

**Server unresponsive:**

Reboot via cloud provider dashboard or:

```bash
sudo reboot
```

**Rollback deployment:**

```bash
# Restore from previous backup
cd /var/www/expandhealth-copilot
tar -xzf backups/deploy_PREVIOUS_TIMESTAMP.tar.gz
pm2 restart expandhealth-copilot
```

---

## Summary

You now have a complete, production-ready deployment of the ExpandHealth AI Copilot at:

**https://copilot.expandhealth.ai**

- Secure HTTPS with auto-renewing SSL
- Automated process management with PM2
- Reverse proxy with Nginx
- Rate limiting and security headers
- Automated backups
- Professional subdomain
- Scalable architecture

**Total Setup Time:** 1-2 hours
**Monthly Cost:** $10-20 (VPS) + $0 (Gemini API free tier)

**Ready to generate treatment plans in seconds!**
