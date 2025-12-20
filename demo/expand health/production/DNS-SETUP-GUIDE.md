# DNS Configuration Guide for copilot.expandhealth.ai

This guide walks you through setting up DNS for the ExpandHealth AI Copilot subdomain.

---

## Overview

**Subdomain:** `copilot.expandhealth.ai`
**Record Type:** A Record (IPv4)
**Points to:** Your VPS IP address
**TTL:** Auto/Default (300-3600 seconds)

---

## Step-by-Step DNS Setup

### Step 1: Find Your Server IP Address

After deploying to your VPS, note the public IP address.

**DigitalOcean:**
- Dashboard → Droplets → Your droplet
- Copy the IP address (e.g., `159.89.123.45`)

**AWS Lightsail:**
- Instances → Your instance
- Copy the Public IP

**Hetzner:**
- Cloud Console → Server → IPv4 address

---

### Step 2: Access DNS Management

Go to where your `expandhealth.ai` domain is managed:

#### Option A: Cloudflare (Recommended)

1. Login to Cloudflare: https://dash.cloudflare.com
2. Click on `expandhealth.ai` domain
3. Go to **DNS** section
4. Proceed to Step 3

#### Option B: GoDaddy

1. Login to GoDaddy
2. My Products → Domains → `expandhealth.ai` → Manage
3. DNS → Manage Zones
4. Proceed to Step 3

#### Option C: Namecheap

1. Login to Namecheap
2. Domain List → `expandhealth.ai` → Manage
3. Advanced DNS
4. Proceed to Step 3

#### Option D: Google Domains

1. Login to Google Domains
2. My domains → `expandhealth.ai` → DNS
3. Proceed to Step 3

#### Option E: AWS Route 53

1. AWS Console → Route 53
2. Hosted zones → `expandhealth.ai`
3. Create record
4. Proceed to Step 3

---

### Step 3: Add DNS A Record

Create a new DNS record with these details:

| Field | Value |
|-------|-------|
| **Type** | A |
| **Name** | copilot |
| **Value / Points to** | Your server IP (e.g., 159.89.123.45) |
| **TTL** | Auto / 300 / 3600 (default) |
| **Proxy** | Enabled (if Cloudflare) |

**Cloudflare-specific:**
- **Proxy status:** Proxied (orange cloud icon) - RECOMMENDED
  - Enables DDoS protection
  - Provides free SSL
  - Hides your origin IP
  - Adds CDN caching

**Example Cloudflare Setup:**

```
Type: A
Name: copilot
IPv4 address: 159.89.123.45
Proxy status: Proxied (🟠 orange cloud)
TTL: Auto
```

**Example GoDaddy Setup:**

```
Type: A
Host: copilot
Points to: 159.89.123.45
TTL: 600 seconds (or default)
```

**Example Route 53 Setup:**

```
Record name: copilot.expandhealth.ai
Record type: A
Value: 159.89.123.45
TTL: 300
Routing policy: Simple
```

---

### Step 4: Verify DNS Propagation

DNS changes can take **5 minutes to 48 hours** to propagate globally.

**Check DNS resolution:**

#### Command Line Tools

**macOS/Linux:**

```bash
# Check DNS resolution
nslookup copilot.expandhealth.ai

# Detailed DNS info
dig copilot.expandhealth.ai

# Expected output:
# copilot.expandhealth.ai A 159.89.123.45
```

**Windows:**

```cmd
nslookup copilot.expandhealth.ai
```

#### Online Tools

Use these websites to check DNS propagation worldwide:

1. **https://www.whatsmydns.net/**
   - Enter: `copilot.expandhealth.ai`
   - Type: A
   - Shows propagation status across multiple global locations

2. **https://dnschecker.org/**
   - Similar global DNS propagation checker

3. **https://mxtoolbox.com/SuperTool.aspx**
   - Comprehensive DNS lookup tool

**What to expect:**

- **Immediately:** Some DNS servers will resolve (especially local)
- **Within 5-30 minutes:** Most DNS servers should resolve
- **Within 24 hours:** Global propagation complete

---

### Step 5: Test Domain Access

Once DNS has propagated:

**Test HTTP access (before SSL):**

```bash
curl http://copilot.expandhealth.ai/health
```

Expected response:

```json
{"status":"healthy","timestamp":"2025-12-14T...","environment":"production",...}
```

**Visit in browser:**

```
http://copilot.expandhealth.ai
```

You should see the ExpandHealth AI Copilot dashboard.

**Note:** At this stage, it's HTTP only. After completing SSL setup (Let's Encrypt or Cloudflare), it will redirect to HTTPS.

---

## Cloudflare-Specific Configuration

If using Cloudflare, additional configuration options:

### SSL/TLS Settings

1. Go to: SSL/TLS section
2. **SSL/TLS encryption mode:** Full (strict)
3. **Always Use HTTPS:** On
4. **Automatic HTTPS Rewrites:** On
5. **Minimum TLS Version:** TLS 1.2

### Security Settings

1. **Security Level:** Medium (or High for extra protection)
2. **Browser Integrity Check:** On
3. **Challenge Passage:** 30 minutes

### Firewall Rules (Optional)

Create firewall rules to:

- Block specific countries (if needed)
- Rate limit requests
- Allow only HTTPS traffic

**Example Rate Limiting Rule:**

```
Field: IP Address
Operator: Equals
Value: (leave empty to apply to all)
Requests: 100
Period: 10 minutes
Action: Block
```

### Page Rules (Optional)

Add page rules for caching and performance:

```
URL: copilot.expandhealth.ai/*
Settings:
- Cache Level: Standard
- Browser Cache TTL: Respect Existing Headers
```

---

## Advanced DNS Configurations

### IPv6 Support (AAAA Record)

If your server has an IPv6 address:

```
Type: AAAA
Name: copilot
IPv6 address: 2001:db8::1 (your server's IPv6)
```

### CNAME Alternative (Not Recommended)

You could use a CNAME record instead of A record, but A records are preferred for apex/subdomain performance.

**Example (not recommended):**

```
Type: CNAME
Name: copilot
Target: your-vps-hostname.provider.com
```

**Why A record is better:**
- Faster resolution (no extra lookup)
- More reliable
- Better for Cloudflare proxy

### Subdomain Delegation (Advanced)

If you want to delegate DNS management for all ExpandHealth subdomains to a separate DNS provider:

```
Type: NS
Name: copilot
Nameserver: ns1.other-provider.com
```

(This is advanced and typically not needed)

---

## SSL Certificate Setup

After DNS is configured and propagated, set up SSL:

### Option 1: Let's Encrypt (Free, Automated)

**On your server:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d copilot.expandhealth.ai
```

Certbot will:
1. Verify DNS points to this server
2. Generate SSL certificate
3. Configure Nginx for HTTPS
4. Set up auto-renewal

**Auto-renewal test:**

```bash
sudo certbot renew --dry-run
```

### Option 2: Cloudflare SSL (If using Cloudflare proxy)

**Cloudflare provides free SSL automatically** when proxy is enabled (orange cloud).

**Setup:**

1. Cloudflare dashboard → SSL/TLS
2. Set mode to: **Full (strict)**
3. Generate Cloudflare Origin Certificate:
   - SSL/TLS → Origin Server → Create Certificate
   - Copy certificate and private key
4. Install on server:

```bash
# Save certificate
sudo nano /etc/ssl/certs/expandhealth-cloudflare-origin.pem
# Paste certificate, save

# Save private key
sudo nano /etc/ssl/private/expandhealth-cloudflare-origin.key
# Paste private key, save
```

5. Update Nginx config:

```nginx
ssl_certificate /etc/ssl/certs/expandhealth-cloudflare-origin.pem;
ssl_certificate_key /etc/ssl/private/expandhealth-cloudflare-origin.key;
```

6. Restart Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

**Advantages:**
- Free SSL
- DDoS protection
- CDN caching
- Automatic certificate renewal

---

## Troubleshooting DNS Issues

### DNS Not Resolving

**Check 1: Verify record was saved**

Go back to your DNS provider and confirm the A record exists for `copilot`.

**Check 2: Wait for propagation**

DNS changes aren't instant. Wait at least 30 minutes.

**Check 3: Flush local DNS cache**

**macOS:**

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux:**

```bash
sudo systemd-resolve --flush-caches
# or
sudo /etc/init.d/nscd restart
```

**Windows:**

```cmd
ipconfig /flushdns
```

**Check 4: Try different DNS server**

```bash
# Use Google DNS
nslookup copilot.expandhealth.ai 8.8.8.8

# Use Cloudflare DNS
nslookup copilot.expandhealth.ai 1.1.1.1
```

### Domain Resolves but Site Doesn't Load

**Issue:** DNS is working, but HTTP connection fails

**Checks:**

1. **Server is running:**
   ```bash
   ssh user@server-ip
   pm2 status
   # Should show expandhealth-copilot running
   ```

2. **Nginx is running:**
   ```bash
   sudo systemctl status nginx
   # Should be active (running)
   ```

3. **Firewall allows HTTP/HTTPS:**
   ```bash
   sudo ufw status
   # Should allow ports 80 and 443
   ```

4. **Test direct server access:**
   ```bash
   curl http://server-ip:3000/health
   # Should return health check
   ```

### Cloudflare "Too Many Redirects" Error

**Cause:** SSL/TLS mode mismatch between Cloudflare and server

**Fix:**

1. Cloudflare dashboard → SSL/TLS
2. Change mode to **Full** or **Full (strict)**
3. Ensure server has SSL certificate installed
4. Clear browser cache and try again

### "ERR_SSL_VERSION_OR_CIPHER_MISMATCH"

**Cause:** SSL certificate not properly configured

**Fix:**

1. Verify SSL certificate is installed:
   ```bash
   sudo certbot certificates
   ```

2. Check Nginx SSL configuration:
   ```bash
   sudo nginx -t
   ```

3. Restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

---

## DNS Best Practices

### 1. Use Short TTL During Setup

While setting up, use a short TTL (300 seconds) so changes propagate quickly.

Once stable, you can increase TTL to 3600 or 86400 for better performance.

### 2. Document Your DNS Records

Keep a record of all DNS entries for `expandhealth.ai`:

```
copilot.expandhealth.ai → A → 159.89.123.45 (Production VPS)
staging.expandhealth.ai → A → 159.89.123.99 (Staging VPS)
www.expandhealth.ai → CNAME → expandhealth.ai
```

### 3. Enable DNSSEC (Optional, Advanced)

DNSSEC adds cryptographic signatures to DNS records for security.

**Enable in Cloudflare:**
- DNS → DNSSEC → Enable DNSSEC
- Add DS records to domain registrar

### 4. Monitor DNS Health

Use monitoring tools to alert if DNS fails:

- Pingdom
- UptimeRobot
- Cloudflare Health Checks (Business plan)

---

## Quick Reference

### Cloudflare Setup (Recommended)

```
1. Cloudflare dashboard
2. expandhealth.ai → DNS
3. Add record:
   - Type: A
   - Name: copilot
   - IPv4: your-server-ip
   - Proxy: On (orange cloud)
4. Save
5. SSL/TLS → Full (strict)
6. Wait 5-30 minutes for propagation
7. Test: curl http://copilot.expandhealth.ai/health
8. Setup SSL on server (Let's Encrypt or Cloudflare Origin)
9. Done!
```

### Non-Cloudflare Setup

```
1. DNS provider dashboard
2. Add A record:
   - Name: copilot
   - Points to: your-server-ip
3. Save
4. Wait 30-60 minutes for propagation
5. Test: curl http://copilot.expandhealth.ai/health
6. Setup Let's Encrypt SSL:
   sudo certbot --nginx -d copilot.expandhealth.ai
7. Done!
```

---

## Next Steps

After DNS is configured and working:

1. ✅ DNS resolves to server IP
2. ✅ HTTP access works: `http://copilot.expandhealth.ai`
3. ⏭️ Setup SSL certificate (HTTPS)
4. ⏭️ Test HTTPS access: `https://copilot.expandhealth.ai`
5. ⏭️ Train ExpandHealth staff on using the copilot
6. ⏭️ Monitor usage and gather feedback

---

## Support Resources

- **Cloudflare Docs:** https://developers.cloudflare.com/dns/
- **Let's Encrypt:** https://letsencrypt.org/getting-started/
- **DNS Checker:** https://www.whatsmydns.net/
- **Nginx SSL Guide:** https://nginx.org/en/docs/http/configuring_https_servers.html

---

**DNS setup complete! 🎉**

Your ExpandHealth AI Copilot is now accessible at:

**https://copilot.expandhealth.ai**
