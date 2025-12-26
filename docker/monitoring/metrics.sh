#!/bin/bash
# ========================================
# Metrics Collection Script
# ========================================

set -e

# Collect system metrics
collect_system_metrics() {
    echo "=== System Metrics ==="
    echo "CPU Usage:"
    top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print "CPU: " $1 "%"}'
    
    echo "Memory Usage:"
    free -h | awk '/^Mem:/ {printf "Memory: %s/%s (%.2f%%)\n", $3,$2,$3*100/$2 }'
    
    echo "Disk Usage:"
    df -h / | awk 'NR==2{printf "Disk: %s/%s (%s)\n", $3,$2,$5}'
    
    echo "Load Average:"
    uptime | awk -F'load average:' '{print "Load: " $2}'
    
    echo "---"
}

# Collect application metrics
collect_app_metrics() {
    echo "=== Application Metrics ==="
    
    # Response time check
    if command -v curl &> /dev/null; then
        response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/api/health 2>/dev/null || echo "N/A")
        echo "API Response Time: ${response_time}s"
        
        # Check Socket.IO connections
        if command -v netstat &> /dev/null; then
            socket_connections=$(netstat -an 2>/dev/null | grep :3000 | grep ESTABLISHED | wc -l || echo "N/A")
            echo "Socket.IO Connections: $socket_connections"
        fi
    fi
    
    echo "---"
}

# Collect database metrics
collect_db_metrics() {
    echo "=== Database Metrics ==="
    
    # Check if PostgreSQL is running
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h localhost -p 5432 -U cannaai &> /dev/null; then
            echo "Database: Connected"
            
            # Get database size
            db_size=$(psql -h localhost -U cannaai -d cannaai_production -t -c "SELECT pg_size_pretty(pg_database_size('cannaai_production'));" 2>/dev/null || echo "N/A")
            echo "Database Size: $db_size"
        else
            echo "Database: Disconnected"
        fi
    fi
    
    echo "---"
}

# Collect Redis metrics
collect_redis_metrics() {
    echo "=== Redis Metrics ==="
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            echo "Redis: Connected"
            
            # Get memory info
            redis_info=$(redis-cli info memory 2>/dev/null || echo "")
            if [ -n "$redis_info" ]; then
                echo "Redis Memory Usage:"
                echo "$redis_info" | grep -E "used_memory_human|used_memory_peak_human" | sed 's/^/  /'
            fi
        else
            echo "Redis: Disconnected"
        fi
    fi
    
    echo "---"
}

# Main execution
main() {
    echo "==================================="
    echo "Metrics Collection - $(date)"
    echo "==================================="
    echo ""
    
    collect_system_metrics
    collect_app_metrics
    collect_db_metrics
    collect_redis_metrics
    
    echo "Metrics collection completed"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
