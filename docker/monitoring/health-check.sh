#!/bin/bash
# ========================================
# Health Check Script for Production
# ========================================

set -e

ENDPOINT=${1:-http://localhost:3000/api/health}
TIMEOUT=5
RETRY_ATTEMPTS=3
RETRY_DELAY=2

check_endpoint() {
    local url=$1
    local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    if [ "$response" = "200" ]; then
        echo "[$(date)] ✓ Health check passed for $url"
        return 0
    else
        echo "[$(date)] ✗ Health check failed for $url (HTTP $response)"
        return 1
    fi
}

# Main health check loop
echo "Starting health monitoring..."
echo "Endpoint: $ENDPOINT"
echo "Timeout: ${TIMEOUT}s"
echo "Retry attempts: $RETRY_ATTEMPTS"
echo "---"

failed_checks=0

for i in $(seq 1 $RETRY_ATTEMPTS); do
    if check_endpoint "$ENDPOINT"; then
        exit 0
    fi
    
    failed_checks=$((i))
    if [ $i -lt $RETRY_ATTEMPTS ]; then
        echo "Retrying in $RETRY_DELAY seconds... ($((i+1))/$RETRY_ATTEMPTS)"
        sleep $RETRY_DELAY
    fi
done

echo "[$(date)] ✗ Health check failed after $failed_checks attempts"
exit 1
