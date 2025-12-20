# ExpandHealth AI Copilot - Production Deployment Package

**Subdomain:** `copilot.expandhealth.ai`
**Status:** Production-ready
**Technology:** Node.js + Gemini 2.5 Flash AI

---

## Quick Start

### Prerequisites

- VPS server (Ubuntu 22.04 recommended)
- Domain access for DNS configuration
- Gemini API key (free from https://aistudio.google.com/apikey)
- Basic command line knowledge

### 1-Minute Setup Checklist

```bash
# 1. Copy .env.template to .env
cp .env.template .env

# 2. Edit .env and add your API keys
nano .env

# 3. Install dependencies
npm install --production

# 4. Start application
./start-production.sh

# 5. Verify
curl http://localhost:3000/health
```

---

## Directory Structure

```
production/
├── server.js                    # Production Node.js server
├── dashboard.html              # Web interface
├── kb-manager.js               # Knowledge base manager
├── kb-config.json              # KB configuration
├── kb-content/                 # Clinical protocols (8 files)
├── package.json                # Dependencies
├── .env.template               # Environment template
├── .env                        # Environment config (create this)
├── deploy.sh                   # Automated deployment
├── start-production.sh         # Production startup
├── backup-kb.sh                # KB backup script
├── DEPLOYMENT-GUIDE.md         # Comprehensive deployment guide
├── DNS-SETUP-GUIDE.md          # DNS configuration help
├── SECURITY-CHECKLIST.md       # Security best practices
└── README.md                   # This file
```

---

## Documentation Overview

### DEPLOYMENT-GUIDE.md (Primary Reference)

**Read this first** for complete deployment instructions.

Covers:
- Chosen subdomain & rationale
- VPS deployment (recommended)
- Alternative deployment options (serverless, Cloud Run)
- Step-by-step server setup
- Nginx reverse proxy configuration
- SSL certificate setup (Let's Encrypt)
- Environment variables
- Monitoring & maintenance
- Troubleshooting

**Estimated deployment time:** 1-2 hours

### DNS-SETUP-GUIDE.md

Detailed instructions for configuring DNS.

Covers:
- DNS record setup (A record)
- Cloudflare configuration
- DNS propagation verification
- SSL setup with Cloudflare
- Troubleshooting DNS issues

### SECURITY-CHECKLIST.md

Comprehensive security hardening guide.

Covers:
- Server security (firewall, SSH, fail2ban)
- Application security (rate limiting, CORS)
- Network security (HTTPS, headers)
- Data security (encryption, backups)
- API security (key management)
- Compliance (GDPR, POPIA, HIPAA)
- Incident response
- Regular maintenance tasks

---

## Environment Variables

### Required

```env
NODE_ENV=production
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
```

### Recommended

```env
ALLOWED_ORIGINS=https://copilot.expandhealth.ai
RATE_LIMIT_MAX=100
MAX_OUTPUT_TOKENS=8192
```

See `.env.template` for complete configuration options.

---

## Deployment Scripts

### deploy.sh - Automated Deployment

Deploys application to production server.

**Usage:**

```bash
export DEPLOY_HOST=your-server-ip
export DEPLOY_USER=your-username
./deploy.sh
```

**What it does:**
1. Packages application
2. Uploads to server
3. Installs dependencies
4. Starts with PM2
5. Verifies deployment

### start-production.sh - Production Startup

Starts application with PM2 process manager.

**Usage:**

```bash
./start-production.sh
```

**What it does:**
1. Checks .env file exists
2. Installs dependencies if needed
3. Creates PM2 ecosystem config
4. Starts application
5. Saves PM2 process list

### backup-kb.sh - Knowledge Base Backup

Backs up clinical protocols and configuration.

**Usage:**

```bash
./backup-kb.sh
```

**What it does:**
1. Creates timestamped backup archive
2. Saves to `./backups/` directory
3. Keeps last 10 backups
4. Deletes older backups automatically

---

## Production Checklist

Before going live, verify:

### Configuration

- [ ] `.env` file created with production values
- [ ] Gemini API key added and tested
- [ ] `ALLOWED_ORIGINS` set to production domain
- [ ] `NODE_ENV=production`

### Server Setup

- [ ] VPS provisioned (Ubuntu 22.04, 2GB RAM minimum)
- [ ] SSH key authentication configured
- [ ] Firewall enabled (ports 22, 80, 443)
- [ ] Node.js 18+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed and configured

### DNS & SSL

- [ ] DNS A record created: `copilot` → server IP
- [ ] DNS propagated (test with `nslookup`)
- [ ] SSL certificate obtained (Let's Encrypt or Cloudflare)
- [ ] HTTPS working: `https://copilot.expandhealth.ai`

### Application

- [ ] Dependencies installed: `npm install --production`
- [ ] Application starts: `./start-production.sh`
- [ ] Health check passes: `curl /health`
- [ ] Dashboard accessible in browser
- [ ] Test treatment plan generation works
- [ ] Test PDF upload works

### Security

- [ ] Rate limiting tested (100 req/15min)
- [ ] CORS configured for production domain only
- [ ] Security headers verified (X-Frame-Options, etc.)
- [ ] Fail2ban installed and active
- [ ] Server hardened (no root SSH, etc.)

### Monitoring

- [ ] PM2 monitoring enabled
- [ ] Server monitoring tool installed (Netdata/PM2 Plus)
- [ ] Log rotation configured
- [ ] Backup cron job scheduled
- [ ] SSL auto-renewal verified

---

## Quick Command Reference

### Application Management

```bash
# Start application
./start-production.sh

# Check status
pm2 status

# View logs
pm2 logs expandhealth-copilot

# Restart
pm2 restart expandhealth-copilot

# Stop
pm2 stop expandhealth-copilot
```

### Maintenance

```bash
# Backup KB
./backup-kb.sh

# Update application
git pull  # If using git
npm install --production
pm2 restart expandhealth-copilot

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx

# Renew SSL
sudo certbot renew
```

### Monitoring

```bash
# Health check
curl https://copilot.expandhealth.ai/health

# Monitor resources
pm2 monit
htop

# Check disk space
df -h

# Check firewall
sudo ufw status
```

---

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs expandhealth-copilot --err

# Verify .env exists
ls -la .env

# Test Node.js
node --version  # Should be 18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --production
```

### 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Restart application
pm2 restart expandhealth-copilot

# Check Nginx config
sudo nginx -t
sudo systemctl restart nginx
```

### SSL issues

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew --force-renewal
sudo systemctl restart nginx
```

### DNS not resolving

```bash
# Check DNS
nslookup copilot.expandhealth.ai

# Wait for propagation (up to 48 hours)
# Use: https://www.whatsmydns.net/

# Flush local DNS cache
sudo systemd-resolve --flush-caches  # Linux
```

See **DEPLOYMENT-GUIDE.md** for detailed troubleshooting.

---

## Support & Resources

### Documentation

- **Primary Guide:** DEPLOYMENT-GUIDE.md
- **DNS Help:** DNS-SETUP-GUIDE.md
- **Security:** SECURITY-CHECKLIST.md

### External Resources

- **Gemini API:** https://aistudio.google.com/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/
- **Cloudflare Docs:** https://developers.cloudflare.com/

### Getting Help

1. Check troubleshooting section in DEPLOYMENT-GUIDE.md
2. Review application logs: `pm2 logs expandhealth-copilot`
3. Check Nginx logs: `/var/log/nginx/error.log`
4. Verify DNS with online tools: https://www.whatsmydns.net/
5. Test SSL: https://www.ssllabs.com/ssltest/

---

## Technology Stack

- **Runtime:** Node.js 18+
- **AI Model:** Google Gemini 2.5 Flash (free tier: 1,500 requests/day)
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt / Cloudflare
- **Server:** Ubuntu 22.04 LTS
- **DNS:** Cloudflare (recommended)

---

## Features

### Current Capabilities

✅ **AI Treatment Plan Generation**
- Powered by Gemini 2.5 Flash
- Uses ExpandHealth clinical protocols
- 15-30 second generation time
- Comprehensive 3-month plans

✅ **PDF Lab Upload**
- Multi-file upload support
- Automatic lab result extraction with Gemini Vision
- 10MB file size limit

✅ **Knowledge Base**
- 8 clinical protocol documents
- Metabolic syndrome, chronic fatigue, cardiovascular protocols
- ExpandHealth brand voice & policies

✅ **Security**
- Rate limiting (100 req/15min)
- CORS protection
- HTTPS enforcement
- Input validation

✅ **Production-Ready**
- Process management with PM2
- Automated restarts
- Log rotation
- Health checks

### Planned Enhancements

- User authentication
- Plan history / saving
- Email integration
- Multi-language support
- Mobile app

---

## Cost Estimate

### Monthly Costs

- **VPS:** $10-20/month (DigitalOcean, AWS Lightsail, Hetzner)
- **Gemini API:** FREE (first 1,500 requests/day, then $0.075/1k requests)
- **Domain:** Assuming already owned
- **SSL:** FREE (Let's Encrypt or Cloudflare)
- **Total:** ~$10-20/month

### Free Tier Limits

- **Gemini 2.5 Flash:** 1,500 requests/day free
- **Let's Encrypt SSL:** Free, unlimited
- **Cloudflare CDN:** Free tier available

---

## License

UNLICENSED - Proprietary to ExpandHealth

---

## Changelog

### Version 1.0.0 (December 2025)

- Initial production release
- Gemini 2.5 Flash integration
- Multi-model support (Gemini, Claude)
- PDF upload with vision extraction
- Knowledge base with 8 clinical protocols
- Rate limiting and security features
- Production deployment scripts
- Comprehensive documentation

---

## Contact

**For ExpandHealth Team:**

This is a production-ready deployment package for the AI Copilot tool. Follow the **DEPLOYMENT-GUIDE.md** for step-by-step deployment instructions.

**Estimated deployment time:** 1-2 hours (first time)
**Deployment complexity:** Beginner-friendly with guide

**Ready to deploy to:**

**https://copilot.expandhealth.ai**

---

**Happy deploying! 🚀**
