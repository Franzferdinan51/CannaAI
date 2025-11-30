#!/bin/bash

echo "🧪 Testing API with curl"
echo "========================"

echo ""
echo "Test 1: Empty leafSymptoms"
echo "Sending POST request with empty leafSymptoms..."
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Test Strain",
    "leafSymptoms": "",
    "phLevel": "",
    "temperature": "",
    "humidity": "",
    "medium": "",
    "growthStage": ""
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  -s

echo ""
echo "Test 2: Valid data"
echo "Sending POST request with valid data..."
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Granddaddy Purple",
    "leafSymptoms": "Yellowing leaves on bottom",
    "phLevel": "6.2",
    "temperature": "75",
    "humidity": "50",
    "medium": "Soil",
    "growthStage": "Flowering"
  }' \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  -s

echo ""
echo "Test 3: Check if API is accessible with GET"
curl -X GET http://localhost:3000/api/analyze \
  -w "\nStatus: %{http_code}\nTime: %{time_total}s\n" \
  -s

echo ""
echo "🏁 Tests completed"