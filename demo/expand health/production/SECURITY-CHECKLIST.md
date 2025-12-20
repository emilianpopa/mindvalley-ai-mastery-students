# ExpandHealth AI Copilot - Security Checklist & Implementation Guide

This comprehensive security checklist ensures your production deployment is secure and follows best practices for healthcare applications.

---

## Table of Contents

1. [Pre-Deployment Security](#pre-deployment-security)
2. [Server Security](#server-security)
3. [Application Security](#application-security)
4. [Network Security](#network-security)
5. [Data Security](#data-security)
6. [API Security](#api-security)
7. [Monitoring & Logging](#monitoring--logging)
8. [Compliance Considerations](#compliance-considerations)
9. [Incident Response](#incident-response)
10. [Regular Maintenance](#regular-maintenance)

---

## Pre-Deployment Security

### API Key Management

- [ ] Generate production API keys (separate from dev/staging)
- [ ] Store API keys in environment variables only (never in code)
- [ ] Verify `.env` file is NOT committed to Git
- [ ] Add `.env` to `.gitignore`
- [ ] Document API key rotation schedule (every 90 days)
- [ ] Set up API usage alerts in Google Cloud Console
- [ ] Use different API keys for different environments

**Checklist:**

```bash
# Verify .env is not in Git
git ls-files | grep .env
# Should return nothing

# Verify .gitignore includes .env
cat .gitignore | grep .env
# Should show .env entry

# Test environment variables load
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY ? 'Loaded' : 'Missing')"
```

### Code Review

- [ ] Review all hardcoded values (no API keys, passwords, IPs)
- [ ] Ensure error messages don't leak sensitive info
- [ ] Verify input validation on all endpoints
- [ ] Check file upload restrictions (type, size)
- [ ] Review CORS configuration (only allowed origins)

---

## Server Security

### Operating System Hardening

**Initial Server Setup:**

- [ ] Update all packages
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo apt autoremove -y
  ```

- [ ] Configure automatic security updates
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

- [ ] Set up hostname
  ```bash
  sudo hostnamectl set-hostname expandhealth-copilot
  ```

### User & Access Management

- [ ] Disable root login via SSH
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PermitRootLogin no
  sudo systemctl restart sshd
  ```

- [ ] Create non-root user for application
  ```bash
  sudo adduser expandhealth
  sudo usermod -aG sudo expandhealth
  ```

- [ ] Use SSH keys only (disable password authentication)
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Set: PasswordAuthentication no
  # Set: PubkeyAuthentication yes
  sudo systemctl restart sshd
  ```

- [ ] Set up SSH key authentication
  ```bash
  # On local machine:
  ssh-keygen -t ed25519 -C "expandhealth-production"
  ssh-copy-id expandhealth@server-ip

  # Test SSH key login:
  ssh expandhealth@server-ip
  ```

- [ ] Configure SSH to use non-standard port (optional, adds security by obscurity)
  ```bash
  sudo nano /etc/ssh/sshd_config
  # Change: Port 22 → Port 2222 (choose unused port)
  sudo systemctl restart sshd
  # Update firewall: sudo ufw allow 2222
  ```

### Firewall Configuration

- [ ] Install and enable UFW (Uncomplicated Firewall)
  ```bash
  sudo apt install ufw
  ```

- [ ] Configure firewall rules
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp      # SSH (or custom port)
  sudo ufw allow 80/tcp      # HTTP
  sudo ufw allow 443/tcp     # HTTPS
  sudo ufw enable
  ```

- [ ] Verify firewall status
  ```bash
  sudo ufw status verbose
  ```

### Intrusion Prevention

- [ ] Install and configure Fail2Ban
  ```bash
  sudo apt install fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] Configure Fail2Ban for SSH
  ```bash
  sudo nano /etc/fail2ban/jail.local
  ```

  Add:
  ```ini
  [sshd]
  enabled = true
  port = 22
  filter = sshd
  logpath = /var/log/auth.log
  maxretry = 3
  bantime = 3600
  findtime = 600
  ```

- [ ] Restart Fail2Ban
  ```bash
  sudo systemctl restart fail2ban
  sudo fail2ban-client status sshd
  ```

### Additional Server Hardening

- [ ] Disable unnecessary services
  ```bash
  sudo systemctl disable bluetooth
  sudo systemctl disable cups
  # Disable any other unneeded services
  ```

- [ ] Configure automatic logout for idle sessions
  ```bash
  echo "export TMOUT=900" >> ~/.bashrc
  # Logs out after 15 minutes of inactivity
  ```

- [ ] Set up file integrity monitoring (optional, advanced)
  ```bash
  sudo apt install aide
  sudo aideinit
  ```

---

## Application Security

### Already Implemented in server.js

✅ **Rate Limiting**
- 100 requests per 15 minutes per IP
- Configurable via `RATE_LIMIT_MAX` environment variable
- Prevents brute-force attacks and API abuse

✅ **CORS Protection**
- Only allowed origins can access API
- Configured via `ALLOWED_ORIGINS` environment variable
- Prevents unauthorized cross-origin requests

✅ **Input Validation**
- File upload restrictions: 10MB max, PDF only
- Request body size limits
- Prevents malicious file uploads

✅ **Request Timeouts**
- 120-second timeout on API requests
- Prevents resource exhaustion
- Avoids hanging connections

✅ **Graceful Shutdown**
- Handles SIGTERM and SIGINT signals
- Closes connections cleanly
- Prevents data loss during restarts

### Additional Application Security

- [ ] Add authentication (if needed for restricted access)
  ```javascript
  // Option 1: Basic Auth
  const basicAuth = require('express-basic-auth');
  app.use(basicAuth({
    users: { 'admin': process.env.ADMIN_PASSWORD },
    challenge: true
  }));

  // Option 2: API Key
  app.use((req, res, next) => {
    const apiKey = req.header('X-API-Key');
    if (apiKey !== process.env.APP_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
  ```

- [ ] Implement request logging (for audit trail)
  ```javascript
  const morgan = require('morgan');
  app.use(morgan('combined', {
    stream: fs.createWriteStream('./logs/access.log', { flags: 'a' })
  }));
  ```

- [ ] Sanitize user inputs (prevent injection attacks)
  ```javascript
  const validator = require('validator');

  // Example: Sanitize patient name
  const sanitizedName = validator.escape(patientName);
  ```

- [ ] Add Content Security Policy header
  ```javascript
  app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
  });
  ```

---

## Network Security

### Nginx Security Headers

Already configured in deployment guide. Verify these headers are set:

- [ ] Verify Nginx security headers
  ```bash
  curl -I https://copilot.expandhealth.ai
  ```

  Should include:
  ```
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  ```

- [ ] Add HSTS header (Strict-Transport-Security)
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  ```

- [ ] Disable server version disclosure
  ```nginx
  server_tokens off;
  ```

- [ ] Configure SSL/TLS securely
  ```nginx
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256...';
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;
  ```

### SSL/TLS Configuration

- [ ] Verify SSL certificate is valid
  ```bash
  sudo certbot certificates
  # Check expiration date
  ```

- [ ] Test SSL configuration
  ```bash
  # Use SSL Labs test
  # Visit: https://www.ssllabs.com/ssltest/analyze.html?d=copilot.expandhealth.ai
  # Aim for A+ rating
  ```

- [ ] Set up auto-renewal verification
  ```bash
  sudo certbot renew --dry-run
  ```

- [ ] Add renewal check to cron
  ```bash
  sudo crontab -e
  # Add: 0 3 * * * certbot renew --quiet
  ```

### DDoS Protection

- [ ] Enable Cloudflare proxy (if using Cloudflare)
  - Automatic DDoS mitigation
  - Rate limiting
  - Bot protection

- [ ] Configure rate limiting at Nginx level (additional layer)
  ```nginx
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

  location /api/ {
      limit_req zone=api_limit burst=20 nodelay;
      # ... rest of config
  }
  ```

- [ ] Set up IP blocking for repeated offenders
  ```bash
  # Block IP at firewall level
  sudo ufw deny from 123.456.789.0
  ```

---

## Data Security

### Patient Data Handling

⚠️ **IMPORTANT:** This application processes patient health information. Follow these guidelines:

- [ ] **Do NOT store patient data** unless absolutely necessary
  - Current implementation: Patient data is processed in memory only
  - Treatment plans are generated and returned, not stored
  - Verify no patient data is logged

- [ ] Ensure logs don't contain patient information
  ```bash
  # Review logs
  pm2 logs expandhealth-copilot

  # Ensure no patient names, lab results, or PHI
  ```

- [ ] Implement data retention policy
  ```
  Current: No patient data stored (in-memory only)
  Logs: Rotate every 7 days, delete after 30 days
  Backups: KB content only (no patient data)
  ```

- [ ] Add disclaimers in dashboard
  ```html
  <!-- Add to dashboard.html -->
  <div class="privacy-notice">
    Note: Patient data is processed securely and is not stored on our servers.
    All information is processed in real-time and immediately discarded.
  </div>
  ```

### Knowledge Base Security

- [ ] Protect KB content (proprietary clinical protocols)
  ```bash
  # Set restrictive permissions
  chmod 700 /var/www/expandhealth-copilot/kb-content
  chmod 600 /var/www/expandhealth-copilot/kb-config.json
  chown expandhealth:expandhealth kb-content kb-config.json
  ```

- [ ] Backup KB content regularly
  ```bash
  # Setup daily backup cron
  crontab -e
  # Add: 0 2 * * * cd /var/www/expandhealth-copilot && ./backup-kb.sh
  ```

- [ ] Encrypt backups (if storing off-site)
  ```bash
  # Encrypt backup
  gpg --symmetric --cipher-algo AES256 backup.tar.gz

  # Decrypt when needed
  gpg --decrypt backup.tar.gz.gpg > backup.tar.gz
  ```

- [ ] Secure backup storage location
  ```bash
  # Store backups in protected directory
  sudo mkdir -p /var/backups/expandhealth
  sudo chmod 700 /var/backups/expandhealth
  sudo chown expandhealth:expandhealth /var/backups/expandhealth
  ```

### Encryption

- [ ] All traffic uses HTTPS (enforced by Nginx)
- [ ] API keys stored in environment variables (not plaintext in code)
- [ ] SSH uses key-based authentication (not passwords)
- [ ] Consider encrypting KB content at rest (advanced)
  ```bash
  # Use LUKS disk encryption or file-level encryption
  # (optional, for highly sensitive protocols)
  ```

---

## API Security

### Gemini API Key Security

- [ ] Use separate API key for production
- [ ] Set API key restrictions in Google Cloud Console:
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Select your API key
  3. Set restrictions:
     - **Application restrictions:** HTTP referrers
     - **API restrictions:** Only Gemini API
     - **Rate limiting:** Configure quotas

- [ ] Monitor API usage
  ```
  Google Cloud Console → APIs & Services → Dashboard
  - Check daily usage
  - Set up budget alerts
  - Review unusual spikes
  ```

- [ ] Rotate API keys regularly (every 90 days)
  ```bash
  # Generate new key in Google Cloud Console
  # Update .env file
  # Restart application
  # Delete old key after verifying new one works
  ```

- [ ] Set up API usage alerts
  ```
  Google Cloud Console → Billing → Budgets & alerts
  - Create budget for Gemini API
  - Alert at 50%, 75%, 90% of budget
  ```

### Rate Limiting Validation

- [ ] Test rate limiting works
  ```bash
  # Send 150 requests rapidly (exceeds 100/15min limit)
  for i in {1..150}; do
    curl https://copilot.expandhealth.ai/health &
  done

  # Should start returning 429 (Too Many Requests) after 100
  ```

- [ ] Adjust rate limits based on usage
  ```env
  # In .env file
  RATE_LIMIT_MAX=200  # Increase if legitimate traffic exceeds limit
  ```

### API Monitoring

- [ ] Monitor API errors and failures
  ```bash
  pm2 logs expandhealth-copilot --err
  # Watch for repeated errors
  ```

- [ ] Track API response times
  ```
  Use monitoring tool (e.g., New Relic, Datadog) or PM2 Plus
  - Alert if response time > 60 seconds
  - Alert if error rate > 5%
  ```

---

## Monitoring & Logging

### Application Logging

- [ ] Configure PM2 logging
  ```bash
  # Logs are in:
  # /var/www/expandhealth-copilot/logs/out.log
  # /var/www/expandhealth-copilot/logs/err.log
  ```

- [ ] Set up log rotation
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  ```

- [ ] Review logs weekly
  ```bash
  # Check error logs
  tail -100 /var/www/expandhealth-copilot/logs/err.log

  # Search for failures
  grep "ERROR" logs/err.log
  grep "Failed" logs/out.log
  ```

### Server Monitoring

- [ ] Install monitoring tool (choose one):

  **Option A: Netdata (Free, comprehensive)**
  ```bash
  bash <(curl -Ss https://my-netdata.io/kickstart.sh)
  # Access: http://server-ip:19999
  ```

  **Option B: PM2 Plus (Application-focused)**
  ```bash
  pm2 plus
  # Follow prompts to link to PM2 cloud dashboard
  ```

- [ ] Monitor key metrics:
  - CPU usage (alert if >80% for 5 minutes)
  - Memory usage (alert if >80%)
  - Disk space (alert if >85%)
  - Network traffic (watch for anomalies)
  - Application uptime

- [ ] Set up alerts
  ```
  Configure alerts in monitoring tool:
  - Server down
  - High CPU/memory
  - Disk space low
  - Application errors spiking
  ```

### Security Monitoring

- [ ] Review auth logs regularly
  ```bash
  sudo tail -50 /var/log/auth.log
  # Look for failed SSH attempts
  ```

- [ ] Check Fail2Ban status
  ```bash
  sudo fail2ban-client status sshd
  # Review banned IPs
  ```

- [ ] Monitor Nginx access logs
  ```bash
  sudo tail -50 /var/log/nginx/access.log
  # Look for unusual patterns
  ```

- [ ] Set up intrusion detection (optional, advanced)
  ```bash
  sudo apt install aide
  # Configure and run regular scans
  ```

---

## Compliance Considerations

### GDPR / Data Protection

- [ ] Document data processing activities
  ```
  What data: Patient health information (processed in memory only)
  Why: Generate treatment plans
  How long: Real-time processing, not stored
  Who has access: ExpandHealth practitioners
  ```

- [ ] Add privacy policy to dashboard
- [ ] Implement data subject rights (access, deletion, portability)
- [ ] Document data breach response plan

### HIPAA Compliance (If applicable in US)

⚠️ **Note:** This application processes Protected Health Information (PHI). For HIPAA compliance:

- [ ] Conduct risk assessment
- [ ] Implement Business Associate Agreement (BAA) with cloud provider
- [ ] Ensure data encryption in transit (HTTPS - ✅ done)
- [ ] Ensure data encryption at rest (if storing PHI)
- [ ] Implement access controls and audit logging
- [ ] Train staff on HIPAA requirements
- [ ] Document security policies

**Current Status:**
- ✅ Data encrypted in transit (HTTPS)
- ✅ No PHI stored (in-memory processing only)
- ⏭️ Add audit logging if PHI storage is added in future
- ⏭️ Implement user authentication if required

### POPIA Compliance (South Africa)

ExpandHealth is in South Africa, so POPIA (Protection of Personal Information Act) applies:

- [ ] Lawful processing: Inform patients their data is being processed
- [ ] Purpose limitation: Only use data for treatment plan generation
- [ ] Data minimization: Only collect necessary information
- [ ] Accuracy: Ensure data accuracy
- [ ] Safeguarding: Implement security measures (done)
- [ ] Accountability: Document compliance measures

---

## Incident Response

### Security Incident Response Plan

- [ ] Document incident response procedures:

  **1. Identification**
  - Detect security incident (unusual access, data breach, etc.)
  - Document what happened, when, and impact

  **2. Containment**
  - Isolate affected systems
  - Block malicious IPs: `sudo ufw deny from <ip>`
  - Rotate compromised API keys immediately
  - Stop application if necessary: `pm2 stop expandhealth-copilot`

  **3. Eradication**
  - Remove threat (malware, unauthorized access, etc.)
  - Patch vulnerabilities
  - Update passwords and keys

  **4. Recovery**
  - Restore from clean backups
  - Verify system integrity
  - Restart application: `pm2 restart expandhealth-copilot`
  - Monitor closely for 24-48 hours

  **5. Post-Incident**
  - Document lessons learned
  - Update security procedures
  - Notify affected parties if required by law

### Emergency Contacts

Document and share with team:

```
Incident Response Team:
- IT Lead: [Name, Phone, Email]
- Security Officer: [Name, Phone, Email]
- Management: [Name, Phone, Email]

External Resources:
- Hosting Provider Support: [Contact info]
- Cloud Provider (Google Cloud): [Contact info]
- Legal/Compliance: [Contact info]
```

### Backup & Recovery Testing

- [ ] Test backup restoration procedure
  ```bash
  # Simulate disaster recovery
  cd /tmp
  tar -xzf /var/backups/expandhealth/kb_backup_latest.tar.gz
  # Verify files extracted correctly
  ```

- [ ] Document recovery time objective (RTO)
  ```
  Target RTO: 1 hour (time to restore service)
  Target RPO: 24 hours (maximum data loss acceptable)
  ```

---

## Regular Maintenance

### Daily

- [ ] Check application status
  ```bash
  pm2 status
  ```

- [ ] Review error logs (if any errors)
  ```bash
  pm2 logs expandhealth-copilot --err --lines 50
  ```

### Weekly

- [ ] Review access logs for anomalies
  ```bash
  sudo tail -200 /var/log/nginx/access.log
  ```

- [ ] Check disk space
  ```bash
  df -h
  # Ensure >20% free on /
  ```

- [ ] Verify backup completed
  ```bash
  ls -lh /var/backups/expandhealth/
  ```

### Monthly

- [ ] Update system packages
  ```bash
  sudo apt update && sudo apt upgrade -y
  sudo reboot  # If kernel updated
  ```

- [ ] Update Node.js dependencies
  ```bash
  npm outdated
  npm update
  pm2 restart expandhealth-copilot
  ```

- [ ] Review and rotate API keys (every 90 days)

- [ ] Test SSL certificate renewal
  ```bash
  sudo certbot renew --dry-run
  ```

- [ ] Review monitoring metrics and set up new alerts if needed

### Quarterly

- [ ] Conduct security audit
  - Review access logs
  - Test intrusion prevention
  - Review firewall rules
  - Check for unused accounts/services

- [ ] Update security documentation

- [ ] Test disaster recovery procedure
  - Restore from backup
  - Verify application works
  - Document any issues

### Annually

- [ ] Full security assessment
- [ ] Compliance review (GDPR, POPIA, HIPAA if applicable)
- [ ] Update incident response plan
- [ ] Staff security training
- [ ] Penetration testing (optional, recommended for high-security environments)

---

## Security Audit Checklist

Use this checklist to verify security posture:

### Server Security
- [ ] Operating system fully updated
- [ ] Firewall enabled and properly configured
- [ ] SSH hardened (keys only, non-root)
- [ ] Fail2Ban active and blocking brute-force attempts
- [ ] No unnecessary services running
- [ ] Server has monitoring in place

### Application Security
- [ ] No API keys in code (only environment variables)
- [ ] Rate limiting active and tested
- [ ] CORS configured for allowed origins only
- [ ] Input validation on all endpoints
- [ ] File upload restrictions enforced
- [ ] Error messages don't leak sensitive info
- [ ] Graceful shutdown implemented

### Network Security
- [ ] HTTPS enforced (all HTTP redirects to HTTPS)
- [ ] SSL certificate valid and auto-renewing
- [ ] Security headers configured (X-Frame-Options, CSP, etc.)
- [ ] DDoS protection enabled (Cloudflare or equivalent)

### Data Security
- [ ] Patient data not stored (in-memory only)
- [ ] Logs don't contain PHI
- [ ] KB content has restrictive permissions
- [ ] Regular backups configured and tested
- [ ] Backups stored securely

### API Security
- [ ] API keys restricted in Google Cloud Console
- [ ] API usage monitoring enabled
- [ ] API key rotation schedule in place
- [ ] Rate limiting protects API from abuse

### Monitoring & Incident Response
- [ ] Application logging configured
- [ ] Server monitoring active
- [ ] Security alerts configured
- [ ] Incident response plan documented
- [ ] Emergency contacts documented

### Compliance
- [ ] Data protection policy documented
- [ ] Privacy policy added to application
- [ ] POPIA compliance verified
- [ ] HIPAA considerations addressed (if applicable)

---

## Tools & Resources

### Security Testing Tools

```bash
# Test SSL configuration
# Visit: https://www.ssllabs.com/ssltest/

# Scan for vulnerabilities (use cautiously)
sudo apt install nmap
nmap -sV copilot.expandhealth.ai

# Check security headers
curl -I https://copilot.expandhealth.ai

# Test rate limiting
ab -n 200 -c 10 https://copilot.expandhealth.ai/health
```

### Monitoring Tools

- **PM2 Plus:** https://pm2.io/plus/
- **Netdata:** https://www.netdata.cloud/
- **UptimeRobot:** https://uptimerobot.com/ (Free website monitoring)
- **Pingdom:** https://www.pingdom.com/
- **Google Cloud Monitoring:** Built-in if using GCP

### Security Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Node.js Security Checklist:** https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices
- **HIPAA Compliance Guide:** https://www.hhs.gov/hipaa/for-professionals/security/
- **POPIA Guide:** https://popia.co.za/

---

## Summary

This security checklist provides comprehensive protection for the ExpandHealth AI Copilot deployment:

✅ **Server hardened** with firewall, fail2ban, SSH keys
✅ **Application secured** with rate limiting, CORS, input validation
✅ **Network protected** with HTTPS, SSL, security headers
✅ **Data safeguarded** with in-memory processing, encrypted backups
✅ **APIs protected** with key restrictions, usage monitoring
✅ **Monitoring enabled** for uptime, errors, security incidents
✅ **Compliance addressed** for GDPR, POPIA, HIPAA considerations

**Regular maintenance ensures ongoing security.**

---

**Security is an ongoing process, not a one-time task. Review and update this checklist regularly.**
