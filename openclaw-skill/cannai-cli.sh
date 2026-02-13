#!/bin/bash
# CannaAI CLI - Command line interface for CannaAI
# Usage: ./cannai-cli.sh <command> [options]

CANNAI_URL="${CANNAI_URL:-http://localhost:3000}"

case "$1" in
  rooms)
    curl -s "$CANNAI_URL/api/rooms" | jq .
    ;;
  room)
    curl -s "$CANNAI_URL/api/rooms/$2" | jq .
    ;;
  plants)
    curl -s "$CANNAI_URL/api/plants" | jq .
    ;;
  plant)
    curl -s "$CANNAI_URL/api/plants/$2" | jq .
    ;;
  strains)
    curl -s "$CANNAI_URL/api/strains" | jq .
    ;;
  sensors)
    curl -s "$CANNAI_URL/api/sensors" | jq .
    ;;
  health)
    curl -s "$CANNAI_URL/api/health" | jq .
    ;;
  *)
    echo "CannaAI CLI"
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  rooms              - List all grow rooms"
    echo "  room <id>         - Get room details"
    echo "  plants             - List all plants"
    echo "  plant <id>        - Get plant details"
    echo "  strains           - List all strains"
    echo "  sensors           - Get sensor readings"
    echo "  health            - Check API health"
    ;;
esac
