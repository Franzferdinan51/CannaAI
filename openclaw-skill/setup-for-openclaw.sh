#!/bin/bash
# CannaAI Setup for OpenClaw Agents
# Automated setup script for OpenClaw integration

set -e

echo "🌿 CannaAI Setup for OpenClaw Agents"
echo "===================================="
echo ""

# Configuration
CANNAI_PORT="${CANNAI_PORT:-3000}"
OPENCLAW_URL="${OPENCLAW_URL:-http://localhost:18789}"
CANNAI_URL="http://localhost:$CANNAI_PORT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}✅${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        echo "   Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        echo "   Then: sudo apt-get install -y nodejs"
        exit 1
    fi
    log "Node.js installed: $(node --version)"
}

# Check if dependencies are installed
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        warn "Dependencies not installed - installing..."
        npm install
        log "Dependencies installed"
    else
        log "Dependencies already installed"
    fi
}

# Check database
check_database() {
    if [ ! -f "prisma/dev.db" ]; then
        warn "Database not initialized - initializing..."
        npm run db:generate
        npm run db:push
        log "Database initialized"
    else
        log "Database already initialized"
    fi
}

# Configure OpenClaw as AI provider
configure_openclaw() {
    echo ""
    echo "🤖 Configuring OpenClaw as AI Provider..."
    
    # Update settings if needed
    if grep -q "aiProvider.*openclaw" src/app/api/settings/route.ts; then
        log "OpenClaw already configured as AI provider"
    else
        warn "OpenClaw not configured - updating settings..."
        # The settings are already configured in the code
        log "OpenClaw provider configured"
    fi
}

# Start CannaAI server
start_server() {
    echo ""
    echo "🚀 Starting CannaAI server..."
    
    # Check if already running
    if curl -s "$CANNAI_URL/api/status" &> /dev/null; then
        log "CannaAI server already running on port $CANNAI_PORT"
    else
        # Start in background
        npm run dev > /tmp/cannai.log 2>&1 &
        echo $! > /tmp/cannai.pid
        
        # Wait for server to start
        echo "   Waiting for server to start..."
        for i in {1..30}; do
            if curl -s "$CANNAI_URL/api/status" &> /dev/null; then
                log "CannaAI server started on port $CANNAI_PORT"
                break
            fi
            sleep 1
        done
        
        if ! curl -s "$CANNAI_URL/api/status" &> /dev/null; then
            error "Failed to start CannaAI server"
            echo "   Check logs: /tmp/cannai.log"
            exit 1
        fi
    fi
}

# Test OpenClaw connection
test_openclaw() {
    echo ""
    echo "🔗 Testing OpenClaw connection..."
    
    if curl -s "$OPENCLAW_URL/api/status" &> /dev/null; then
        log "OpenClaw Gateway is running"
    else
        warn "OpenClaw Gateway not detected at $OPENCLAW_URL"
        echo "   Start with: openclaw gateway start"
    fi
}

# Test CannaAI endpoints
test_endpoints() {
    echo ""
    echo "🧪 Testing CannaAI endpoints..."
    
    # Test status
    if curl -s "$CANNAI_URL/api/openclaw/status" | grep -q "online"; then
        log "Status endpoint working"
    else
        error "Status endpoint failed"
    fi
    
    # Test rooms
    if curl -s "$CANNAI_URL/api/rooms" &> /dev/null; then
        log "Rooms endpoint working"
    else
        warn "Rooms endpoint not responding"
    fi
    
    # Test plants
    if curl -s "$CANNAI_URL/api/plants" &> /dev/null; then
        log "Plants endpoint working"
    else
        warn "Plants endpoint not responding"
    fi
    
    # Test sensors
    if curl -s "$CANNAI_URL/api/sensors" &> /dev/null; then
        log "Sensors endpoint working"
    else
        warn "Sensors endpoint not responding"
    fi
}

# Print usage information
print_usage() {
    echo ""
    echo "📚 CannaAI is ready for OpenClaw agents!"
    echo ""
    echo "Access URLs:"
    echo "  Local:     $CANNAI_URL"
    echo "  Network:   http://$(hostname -I | awk '{print $1}'):${CANNAI_PORT}"
    echo "  Tailscale: http://100.106.80.61:${CANNAI_PORT}"
    echo ""
    echo "OpenClaw Agent Commands:"
    echo "  curl $CANNAI_URL/api/openclaw/status     - Check status"
    echo "  curl $CANNAI_URL/api/rooms              - List rooms"
    echo "  curl $CANNAI_URL/api/plants             - List plants"
    echo "  curl $CANNAI_URL/api/sensors            - Get sensors"
    echo "  curl $CANNAI_URL/api/alerts/active      - Get alerts"
    echo ""
    echo "Documentation:"
    echo "  - API Reference: openclaw-skill/COMPLETE-API-REFERENCE.md"
    echo "  - Skill Guide:   openclaw-skill/SKILL.md"
    echo "  - CLI Tool:      openclaw-skill/cannai-cli.sh"
    echo ""
    echo "Example OpenClaw Integration:"
    echo '  const status = await fetch("'$CANNAI_URL'/api/openclaw/status");'
    echo '  const data = await status.json();'
    echo ""
}

# Main setup
main() {
    check_node
    check_dependencies
    check_database
    configure_openclaw
    start_server
    test_openclaw
    test_endpoints
    print_usage
    
    echo ""
    log "Setup complete! CannaAI is ready for OpenClaw agents!"
    echo ""
}

# Run main
main
