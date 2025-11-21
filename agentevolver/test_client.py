#!/usr/bin/env python3
"""
Test client for AgentEvolver server
"""

import requests
import json
import time

def test_agentevolver():
    """Test the AgentEvolver server functionality"""
    base_url = "http://localhost:8001"

    print("🤖 Testing AgentEvolver Server...")
    print("=" * 50)

    # Test 1: Server status
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            data = response.json()
            print("✅ Server is running!")
            print(f"   Version: {data.get('version')}")
            print(f"   Status: {data.get('status')}")
            print(f"   Capabilities: {', '.join(data.get('capabilities', []))}")
        else:
            print(f"❌ Server status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {str(e)}")
        return False

    # Test 2: Health check
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Health Status: {data.get('status')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")

    # Test 3: Prompt optimization
    test_prompt = "Analyze this plant for health issues"
    test_context = {
        "strain": "Blue Dream",
        "symptoms": ["yellow leaves", "slow growth"],
        "environment": {
            "temperature": 75,
            "humidity": 60
        }
    }

    try:
        print(f"\n🔬 Testing prompt optimization...")
        print(f"Original prompt: {test_prompt}")

        response = requests.post(
            f"{base_url}/optimize",
            json={
                "prompt": test_prompt,
                "context": test_context,
                "task_type": "analysis"
            }
        )

        if response.status_code == 200:
            result = response.json()
            print("✅ Prompt optimization successful!")
            print(f"   Success: {result.get('success')}")
            print(f"   Improvement: {result.get('improvement', 0):.3f}")
            print(f"   Confidence: {result.get('confidence', 0):.3f}")
            print(f"   Processing time: {result.get('processing_time', 0):.3f}s")

            if result.get('optimized_prompt'):
                print(f"   Optimized prompt: {result['optimized_prompt']}")

            if result.get('suggestions'):
                print("   Suggestions:")
                for suggestion in result.get('suggestions', []):
                    print(f"     • {suggestion.get('description', 'No description')}")
        else:
            print(f"❌ Prompt optimization failed: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"❌ Prompt optimization error: {str(e)}")

    # Test 4: Get metrics
    try:
        response = requests.get(f"{base_url}/metrics")
        if response.status_code == 200:
            metrics = response.json()
            print("\n📊 Current Metrics:")
            print(f"   Total optimizations: {metrics.get('total_optimizations', 0)}")
            print(f"   Successful evolutions: {metrics.get('successful_evolutions', 0)}")
            print(f"   Failed evolutions: {metrics.get('failed_evolutions', 0)}")
            print(f"   Average improvement: {metrics.get('average_improvement', 0):.3f}")
            print(f"   Evolution progress: {metrics.get('evolution_progress', 0):.3f}")
        else:
            print(f"❌ Metrics request failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Metrics error: {str(e)}")

    print("\n" + "=" * 50)
    print("🎉 AgentEvolver test completed!")
    return True

if __name__ == "__main__":
    test_agentevolver()