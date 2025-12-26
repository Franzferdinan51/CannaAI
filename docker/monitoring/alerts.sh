#!/bin/bash
# ========================================
# Alert Script for Monitoring
# ========================================

set -e

ALERT_EMAIL=${ALERT_EMAIL:-admin@yourdomain.com}
SMTP_HOST=${SMTP_HOST:-}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_USER=${SMTP_USER:-}
SMTP_PASS=${SMTP_PASS:-}

send_alert() {
    local subject="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] ALERT: $subject"
    echo "[$timestamp] $message"
    
    if [ -n "$SMTP_HOST" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "[ALERT] $subject" "$ALERT_EMAIL"
    fi
}

# Check high CPU usage
check_cpu() {
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_threshold=80
    
    if (( $(echo "$cpu_usage > $cpu_threshold" | bc -l 2>/dev/null || echo "0") )); then
        send_alert "High CPU Usage" "CPU usage is at ${cpu_usage}%, which exceeds the threshold of ${cpu_threshold}%"
    fi
}

# Check high memory usage
check_memory() {
    memory_percent=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100.0}')
    memory_threshold=85
    
    if [ "$memory_percent" -gt "$memory_threshold" ]; then
        send_alert "High Memory Usage" "Memory usage is at ${memory_percent}%, which exceeds the threshold of ${memory_threshold}%"
    fi
}

# Check high disk usage
check_disk() {
    disk_percent=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    disk_threshold=90
    
    if [ "$disk_percent" -gt "$disk_threshold" ]; then
        send_alert "High Disk Usage" "Disk usage is at ${disk_percent}%, which exceeds the threshold of ${disk_threshold}%"
    fi
}

# Check application health
check_app() {
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/api/health 2>/dev/null || echo "000")
    
    if [ "$response" != "200" ]; then
        send_alert "Application Unhealthy" "Application health check failed with HTTP status code: $response"
    fi
}

# Check database connection
check_database() {
    if ! pg_isready -h localhost -p 5432 -U cannaai &> /dev/null; then
        send_alert "Database Unavailable" "PostgreSQL database is not responding"
    fi
}

# Check Redis connection
check_redis() {
    if ! redis-cli ping &> /dev/null; then
        send_alert "Redis Unavailable" "Redis cache is not responding"
    fi
}

# Main execution
main() {
    echo "Running health checks at $(date)..."
    
    check_cpu
    check_memory
    check_disk
    check_app
    check_database
    check_redis
    
    echo "Health checks completed"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
