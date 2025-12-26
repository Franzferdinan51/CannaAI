# Remote Access Configuration for CannaAI

This guide explains how to access your CannaAI application both locally and remotely via Tailscale or your local network.

## Quick Start

### Option 1: Use the Remote Access Script
Simply run:
```bash
start-remote.bat
```

### Option 2: Manual Start
```bash
set HOST=0.0.0.0
npm run dev
```

## Access Methods

### Local Access
- **URL**: http://localhost:3000
- **Usage**: For development and testing on the same machine

### Network Access (LAN)
- **URL**: http://[your-local-ip]:3000
- **Example**: http://192.168.1.100:3000
- **Usage**: For other devices on your local network

### Tailscale Remote Access
- **URL**: http://[tailscale-ip]:3000
- **Example**: http://100.101.102.103:3000
- **Magic DNS**: http://[machine-name].[tailnet-name].ts.net:3000

## Configuration Details

### Server Binding
- **Host**: 0.0.0.0 (all network interfaces)
- **Port**: 3000 (default)

### CORS Configuration
The server automatically allows connections from:
- localhost variants (127.0.0.1, 0.0.0.0)
- Tailscale IPs (100.x.x.x range)
- Local network ranges:
  - 192.168.x.x
  - 10.x.x.x
  - 172.16-31.x.x
- Any hostname on port 3000 (for development flexibility)

## Setup Instructions

### 1. Windows Firewall Configuration
If you're accessing the app remotely, you may need to configure Windows Firewall:

1. Open **Windows Defender Firewall with Advanced Security**
2. Click on **Inbound Rules**
3. Click **New Rule...**
4. Select **Port**
5. Choose **TCP** and specific port **3000**
6. Select **Allow the connection**
7. Check **Domain**, **Private**, and **Public** (for Tailscale)
8. Name the rule: "CannaAI Remote Access"

### 2. Tailscale Setup (if not already configured)
1. Install Tailscale on your server machine
2. Sign in to your Tailscale account
3. Install Tailscale on your client device
4. Use the same account to connect both devices

### 3. Finding Your Access URLs

#### Local IP Address
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

#### Tailscale IP
```bash
tailscale ip -4
```

#### Tailscale Magic DNS
```bash
tailscale status
```
Your machine name will be listed in the output.

## Security Considerations

### Development Mode (Current)
- CORS is permissive for local development
- No authentication required
- Suitable for trusted networks only

### Production Recommendations
- Set `NODE_ENV=production`
- Configure explicit allowed origins with `SOCKET_IO_ORIGINS`
- Enable authentication with `SOCKET_IO_AUTH=true`
- Use HTTPS/SSL certificates

### Environment Variables
```bash
# Server binding (0.0.0.0 for remote access)
HOST=0.0.0.0

# Server port
PORT=3000

# Allowed CORS origins (comma-separated)
SOCKET_IO_ORIGINS=http://localhost:3000,http://100.101.102.103:3000

# Enable authentication
SOCKET_IO_AUTH=false
```

## Troubleshooting

### Port Already in Use
If you get "EADDRINUSE" error:
1. Check what's using port 3000: `netstat -ano | findstr :3000`
2. Kill the process: `taskkill /PID [process-id] /F`
3. Or use a different port: `set PORT=3001`

### Connection Refused
1. Check Windows Firewall settings
2. Ensure the server is binding to 0.0.0.0 (not 127.0.0.1)
3. Verify your IP address is correct

### Tailscale Not Working
1. Verify Tailscale status: `tailscale status`
2. Check Tailscale IP: `tailscale ip -4`
3. Ensure both devices are on the same tailnet

### CORS Errors
The server should handle most CORS scenarios automatically. If you encounter CORS errors:
1. Check the server console for blocked origins
2. Add your specific URL to SOCKET_IO_ORIGINS environment variable

## Mobile Access

### iOS/Android Apps
- Use the Tailscale IP or Magic DNS URL
- Ensure mobile apps can handle self-signed certificates in development

### Progressive Web App (PWA)
The CannaAI application can be installed as a PWA on mobile devices for a native-like experience.

## Performance Tips

1. **Wired Connection**: Use Ethernet instead of WiFi when possible
2. **5GHz WiFi**: Better performance than 2.4GHz for local network access
3. **Close Background Apps**: Reduce network congestion
4. **Tailscale vs VPN**: Tailscale is optimized for low-latency connections

## Advanced Configuration

### Custom Domain with Tailscale
You can set up custom domain names with Tailscale:
1. Configure DNS in your Tailscale admin console
2. Use your custom domain instead of IP addresses

### Reverse Proxy
For production deployment, consider using a reverse proxy like:
- Nginx
- Caddy (with automatic HTTPS)
- Cloudflare Tunnel

### SSL Certificates
For production use with custom domains:
- Use Let's Encrypt certificates
- Configure your reverse proxy for HTTPS termination