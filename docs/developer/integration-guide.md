# API Integration Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Setup](#authentication-setup)
3. [JavaScript/TypeScript Integration](#javascripttypescript-integration)
4. [Python Integration](#python-integration)
5. [cURL Examples](#curl-examples)
6. [Mobile App Integration](#mobile-app-integration)
7. [React Integration](#react-integration)
8. [Webhook Integration](#webhook-integration)
9. [Third-Party Integrations](#third-party-integrations)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [Best Practices](#best-practices)

## Quick Start

This guide will help you integrate the CultivAI Pro Photo Analysis API into your applications. We'll cover multiple programming languages and frameworks.

### What You'll Need

1. **API Endpoint**: `https://api.cultivaipro.com/v1` (or your local instance)
2. **AI Provider**: OpenRouter API key (cloud) or LM Studio (local)
3. **Image**: Plant photo in JPEG, PNG, WEBP, or HEIC format

### Simple Test Request

```bash
curl -X POST https://api.cultivaipro.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Granddaddy Purple",
    "leafSymptoms": "Yellowing on lower leaves starting from tips"
  }'
```

## Authentication Setup

The API uses AI providers for authentication. Choose one:

### Option 1: OpenRouter (Recommended for Production)

1. Get API key from https://openrouter.ai/keys
2. Configure in your environment:
   ```bash
   export OPENROUTER_API_KEY=sk-or-v1-your-key-here
   ```
3. The API will automatically use OpenRouter when configured

### Option 2: LM Studio (Development/Local)

1. Download LM Studio from https://lmstudio.ai/
2. Start the local server (default: http://localhost:1234)
3. Configure in your environment:
   ```bash
   export LM_STUDIO_URL=http://localhost:1234
   ```

## JavaScript/TypeScript Integration

### Basic Setup

#### Installation
```bash
npm install axios
# or
yarn add axios
```

#### TypeScript Client Example

```typescript
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface AnalysisRequest {
  plantId?: string;
  strain: string;
  leafSymptoms: string;
  phLevel?: number;
  temperature?: number;
  humidity?: number;
  medium?: string;
  growthStage?: string;
  temperatureUnit?: 'C' | 'F';
  plantImage?: string;
  pestDiseaseFocus?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  additionalNotes?: string;
}

interface AnalysisResult {
  diagnosis: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  healthScore: number;
  symptomsMatched: string[];
  causes: string[];
  treatment: string[];
  priorityActions: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

class CultivAIPro {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout for analysis
    });
  }

  async analyzePlant(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const response: AxiosResponse = await this.client.post('/api/analyze', request);

      if (response.data.success) {
        return response.data.analysis;
      } else {
        throw new Error(response.data.error?.message || 'Analysis failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `API Error: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  async analyzeTrichomes(
    imageBase64: string,
    deviceInfo: {
      deviceId: string;
      label: string;
      mode: 'microscope' | 'mobile';
      resolution: { width: number; height: number };
      magnification: number;
      deviceType: string;
    }
  ) {
    try {
      const response = await this.client.post('/api/trichome-analysis', {
        imageData: imageBase64,
        deviceInfo,
        analysisOptions: {
          enableHarvestReadiness: true,
          enableMaturityAssessment: true,
        },
      });

      if (response.data.success) {
        return response.data.analysis;
      } else {
        throw new Error(response.data.error?.message || 'Trichome analysis failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `API Error: ${error.response?.data?.error?.message || error.message}`
        );
      }
      throw error;
    }
  }

  async getAnalysisHistory() {
    const response = await this.client.get('/api/history');
    return response.data.history;
  }

  async getPlantAnalyses(plantId: string) {
    const response = await this.client.get(`/api/plants/${plantId}/analyses`);
    return response.data.data;
  }
}

// Usage Example
async function example() {
  const client = new CultivAIPro('http://localhost:3000');

  try {
    const analysis = await client.analyzePlant({
      strain: 'Granddaddy Purple',
      leafSymptoms: 'Yellowing on lower leaves starting from tips, moving inward',
      phLevel: 6.2,
      temperature: 72,
      humidity: 55,
      medium: 'Coco Coir',
      growthStage: 'Flowering Week 5',
      urgency: 'medium',
    });

    console.log('Diagnosis:', analysis.diagnosis);
    console.log('Confidence:', analysis.confidence);
    console.log('Health Score:', analysis.healthScore);
    console.log('Treatment:', analysis.treatment);
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}
```

#### Complete React Component

```tsx
import React, { useState } from 'react';
import { CultivAIPro } from './CultivAIProClient';

interface PlantAnalysisFormProps {
  onAnalysisComplete: (result: any) => void;
}

export const PlantAnalysisForm: React.FC<PlantAnalysisFormProps> = ({
  onAnalysisComplete,
}) => {
  const [formData, setFormData] = useState({
    strain: '',
    leafSymptoms: '',
    phLevel: '',
    temperature: '',
    humidity: '',
    medium: '',
    growthStage: '',
    image: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const client = new CultivAIPro();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const request: any = {
        strain: formData.strain,
        leafSymptoms: formData.leafSymptoms,
      };

      // Add optional fields if provided
      if (formData.phLevel) request.phLevel = parseFloat(formData.phLevel);
      if (formData.temperature) request.temperature = parseFloat(formData.temperature);
      if (formData.humidity) request.humidity = parseFloat(formData.humidity);
      if (formData.medium) request.medium = formData.medium;
      if (formData.growthStage) request.growthStage = formData.growthStage;

      // Add image if uploaded
      if (formData.image) {
        request.plantImage = await convertToBase64(formData.image);
      }

      const result = await client.analyzePlant(request);
      onAnalysisComplete(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="plant-analysis-form">
      <div>
        <label>Strain *</label>
        <input
          type="text"
          value={formData.strain}
          onChange={(e) => setFormData({ ...formData, strain: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Symptoms *</label>
        <textarea
          value={formData.leafSymptoms}
          onChange={(e) => setFormData({ ...formData, leafSymptoms: e.target.value })}
          required
        />
      </div>

      <div>
        <label>pH Level</label>
        <input
          type="number"
          step="0.1"
          value={formData.phLevel}
          onChange={(e) => setFormData({ ...formData, phLevel: e.target.value })}
        />
      </div>

      <div>
        <label>Temperature</label>
        <input
          type="number"
          value={formData.temperature}
          onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
        />
      </div>

      <div>
        <label>Humidity (%)</label>
        <input
          type="number"
          value={formData.humidity}
          onChange={(e) => setFormData({ ...formData, humidity: e.target.value })}
        />
      </div>

      <div>
        <label>Plant Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Plant'}
      </button>
    </form>
  );
};
```

## Python Integration

### Installation

```bash
pip install requests
```

### Python Client Example

```python
import requests
import base64
import json
from typing import Optional, Dict, Any


class CultivAIProClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
        })

    def encode_image_to_base64(self, image_path: str) -> str:
        """Convert image file to base64 data URL"""
        with open(image_path, 'rb') as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded_string}"

    def analyze_plant(
        self,
        strain: str,
        leaf_symptoms: str,
        ph_level: Optional[float] = None,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        medium: Optional[str] = None,
        growth_stage: Optional[str] = None,
        plant_image_path: Optional[str] = None,
        temperature_unit: str = "F",
        urgency: str = "medium"
    ) -> Dict[Any, Any]:
        """
        Analyze plant health from photo and symptoms

        Args:
            strain: Cannabis strain name
            leaf_symptoms: Description of symptoms
            ph_level: pH level
            temperature: Temperature
            humidity: Humidity percentage
            medium: Growing medium
            growth_stage: Current growth stage
            plant_image_path: Path to plant photo
            temperature_unit: Temperature unit (C or F)
            urgency: Urgency level

        Returns:
            Analysis results dictionary
        """
        payload = {
            "strain": strain,
            "leafSymptoms": leaf_symptoms,
            "temperatureUnit": temperature_unit,
            "urgency": urgency
        }

        # Add optional parameters
        if ph_level is not None:
            payload["phLevel"] = ph_level
        if temperature is not None:
            payload["temperature"] = temperature
        if humidity is not None:
            payload["humidity"] = humidity
        if medium is not None:
            payload["medium"] = medium
        if growth_stage is not None:
            payload["growthStage"] = growth_stage

        # Add image if provided
        if plant_image_path:
            payload["plantImage"] = self.encode_image_to_base64(plant_image_path)

        try:
            response = self.session.post(
                f"{self.base_url}/api/analyze",
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            data = response.json()

            if data.get("success"):
                return data["analysis"]
            else:
                raise Exception(data.get("error", {}).get("message", "Analysis failed"))

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")

    def analyze_trichomes(
        self,
        image_path: str,
        device_info: Dict[str, Any],
        enable_harvest_readiness: bool = True,
        enable_maturity_assessment: bool = True
    ) -> Dict[Any, Any]:
        """
        Analyze trichome maturity for harvest timing

        Args:
            image_path: Path to trichome image
            device_info: Device information dictionary
            enable_harvest_readiness: Enable harvest readiness check
            enable_maturity_assessment: Enable maturity assessment

        Returns:
            Trichome analysis results
        """
        payload = {
            "imageData": self.encode_image_to_base64(image_path),
            "deviceInfo": device_info,
            "analysisOptions": {
                "enableHarvestReadiness": enable_harvest_readiness,
                "enableMaturityAssessment": enable_maturity_assessment
            }
        }

        try:
            response = self.session.post(
                f"{self.base_url}/api/trichome-analysis",
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            data = response.json()

            if data.get("success"):
                return data["analysis"]
            else:
                raise Exception(data.get("error", {}).get("message", "Analysis failed"))

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")

    def get_analysis_history(self) -> list:
        """Get all analysis history"""
        try:
            response = self.session.get(f"{self.base_url}/api/history")
            response.raise_for_status()
            data = response.json()

            if data.get("success"):
                return data["history"]
            else:
                raise Exception("Failed to retrieve history")

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")

    def get_plant_analyses(self, plant_id: str) -> list:
        """Get analyses for a specific plant"""
        try:
            response = self.session.get(f"{self.base_url}/api/plants/{plant_id}/analyses")
            response.raise_for_status()
            data = response.json()

            if data.get("success"):
                return data["data"]
            else:
                raise Exception("Failed to retrieve plant analyses")

        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {str(e)}")


# Example Usage
if __name__ == "__main__":
    client = CultivAIProClient("http://localhost:3000")

    try:
        # Basic analysis without image
        result = client.analyze_plant(
            strain="Granddaddy Purple",
            leaf_symptoms="Yellowing on lower leaves starting from tips",
            ph_level=6.2,
            temperature=72,
            humidity=55,
            medium="Coco Coir",
            growth_stage="Flowering Week 5"
        )

        print("Diagnosis:", result["diagnosis"])
        print("Confidence:", result["confidence"])
        print("Health Score:", result["healthScore"])
        print("Treatment:", result["treatment"])

        # Analysis with image
        result_with_image = client.analyze_plant(
            strain="White Widow",
            leaf_symptoms="White powdery coating on upper leaves",
            plant_image_path="./plant_photo.jpg"
        )

        print("\nWith Image - Diagnosis:", result_with_image["diagnosis"])

        # Trichome analysis
        device_info = {
            "deviceId": "microscope_001",
            "label": "Dino-Lite AM3113",
            "mode": "microscope",
            "resolution": {"width": 1920, "height": 1080},
            "magnification": 200,
            "deviceType": "USB Microscope"
        }

        trichome_result = client.analyze_trichomes(
            image_path="./trichome_photo.jpg",
            device_info=device_info
        )

        print("\nTrichome Analysis:")
        print("Overall Maturity:", trichome_result["trichomeAnalysis"]["overallMaturity"])
        print("Harvest Readiness:", trichome_result["trichomeAnalysis"]["harvestReadiness"])

    except Exception as e:
        print(f"Error: {e}")
```

### Django Integration Example

```python
# views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import base64
import json
from .cultivai_client import CultivAIProClient

client = CultivAIProClient()

@csrf_exempt
@require_http_methods(["POST"])
def analyze_plant(request):
    try:
        data = json.loads(request.body)

        result = client.analyze_plant(
            strain=data['strain'],
            leaf_symptoms=data['leafSymptoms'],
            ph_level=data.get('phLevel'),
            temperature=data.get('temperature'),
            humidity=data.get('humidity'),
            medium=data.get('medium'),
            growth_stage=data.get('growthStage'),
            plant_image_path=data.get('plantImage')
        )

        return JsonResponse({
            'success': True,
            'analysis': result
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

## cURL Examples

### Basic Plant Analysis

```bash
curl -X POST https://api.cultivaipro.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "Granddaddy Purple",
    "leafSymptoms": "Yellowing on lower leaves starting from tips",
    "phLevel": 6.2,
    "temperature": 72,
    "humidity": 55,
    "medium": "Coco Coir",
    "growthStage": "Flowering Week 5",
    "urgency": "medium"
  }'
```

### Plant Analysis with Image

```bash
curl -X POST https://api.cultivaipro.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "strain": "White Widow",
    "leafSymptoms": "White powdery coating on upper leaves",
    "plantImage": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
  }'
```

### Trichome Analysis

```bash
curl -X POST https://api.cultivaipro.com/api/trichome-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "deviceInfo": {
      "deviceId": "microscope_001",
      "label": "Dino-Lite AM3113",
      "mode": "microscope",
      "resolution": {
        "width": 1920,
        "height": 1080
      },
      "magnification": 200,
      "deviceType": "USB Microscope"
    },
    "analysisOptions": {
      "enableHarvestReadiness": true,
      "enableMaturityAssessment": true
    }
  }'
```

### Get Analysis History

```bash
curl -X GET https://api.cultivaipro.com/api/history
```

### Get Plant Analyses

```bash
curl -X GET https://api.cultivaipro.com/api/plants/plant_123/analyses
```

### Check Service Status

```bash
curl -X GET https://api.cultivaipro.com/api/analyze
```

### Batch Analysis Script

```bash
#!/bin/bash

# Batch analyze multiple plants
PLANTS=(
  '{"strain":"OG Kush","leafSymptoms":"Brown spots on leaves"}'
  '{"strain":"Blue Dream","leafSymptoms":"Yellowing tips"}'
  '{"strain":"Sour Diesel","leafSymptoms":"Wilting"}'
)

for i in "${!PLANTS[@]}"; do
  echo "Analyzing plant $((i+1))/$((${#PLANTS[@]}))"

  response=$(curl -s -X POST https://api.cultivaipro.com/api/analyze \
    -H "Content-Type: application/json" \
    -d "${PLANTS[i]}")

  echo "$response" | jq '.analysis.diagnosis' 2>/dev/null || echo "$response"
  echo "---"
done
```

## Mobile App Integration

### React Native Example

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Image, Alert } from 'react-native';
import { CultivAIPro } from './CultivAIProClient';

export const PlantAnalysisScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    strain: '',
    symptoms: '',
  });
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const client = new CultivAIPro('http://your-api-url.com');

  const takePicture = async () => {
    // Implement camera/picker logic
    // Convert to base64
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const request: any = {
        strain: formData.strain,
        leafSymptoms: formData.symptoms,
      };

      if (image) {
        request.plantImage = image;
      }

      const analysis = await client.analyzePlant(request);
      setResult(analysis);
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Strain"
        value={formData.strain}
        onChangeText={(text) => setFormData({ ...formData, strain: text })}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Symptoms"
        value={formData.symptoms}
        onChangeText={(text) => setFormData({ ...formData, symptoms: text })}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
        multiline
        numberOfLines={4}
      />

      {image && (
        <Image source={{ uri: image }} style={{ width: 200, height: 200, marginBottom: 10 }} />
      )}

      <Button title="Take Picture" onPress={takePicture} />
      <View style={{ height: 10 }} />
      <Button title="Analyze" onPress={handleAnalyze} disabled={loading} />

      {result && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {result.diagnosis}
          </Text>
          <Text>Confidence: {result.confidence}%</Text>
          <Text>Health Score: {result.healthScore}</Text>
        </View>
      )}
    </View>
  );
};
```

### Swift (iOS) Example

```swift
import Foundation

struct AnalysisRequest: Codable {
    let strain: String
    let leafSymptoms: String
    let phLevel: Double?
    let temperature: Double?
    let humidity: Double?
    let medium: String?
    let growthStage: String?
    let plantImage: String?
    let urgency: String
}

struct AnalysisResponse: Codable {
    let success: Bool
    let analysis: AnalysisResult?
    let error: ErrorInfo?
}

struct AnalysisResult: Codable {
    let diagnosis: String
    let confidence: Int
    let severity: String
    let healthScore: Int
    let treatment: [String]
    let priorityActions: [String]
}

class CultivAIProClient {
    let baseURL: String

    init(baseURL: String = "http://localhost:3000") {
        self.baseURL = baseURL
    }

    func analyzePlant(request: AnalysisRequest, completion: @escaping (Result<AnalysisResult, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/analyze") else {
            completion(.failure(NSError(domain: "InvalidURL", code: 0)))
            return
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        do {
            urlRequest.httpBody = try JSONEncoder().encode(request)
        } catch {
            completion(.failure(error))
            return
        }

        URLSession.shared.dataTask(with: urlRequest) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }

            guard let data = data else {
                completion(.failure(NSError(domain: "NoData", code: 0)))
                return
            }

            do {
                let result = try JSONDecoder().decode(AnalysisResponse.self, from: data)
                if result.success, let analysis = result.analysis {
                    completion(.success(analysis))
                } else {
                    completion(.failure(NSError(domain: "AnalysisFailed", code: 0, userInfo: [NSLocalizedDescriptionKey: result.error?.message ?? "Unknown error"])))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }

    func imageToBase64(image: UIImage) -> String? {
        guard let imageData = image.jpegData(compressionQuality: 0.9) else {
            return nil
        }
        let base64 = imageData.base64EncodedString(options: .lineLength64Characters)
        return "data:image/jpeg;base64,\(base64)"
    }
}

// Usage
let client = CultivAIProClient()
let request = AnalysisRequest(
    strain: "Granddaddy Purple",
    leafSymptoms: "Yellowing on lower leaves",
    phLevel: 6.2,
    temperature: 72.0,
    humidity: 55.0,
    medium: "Coco Coir",
    growthStage: "Flowering Week 5",
    plantImage: nil,
    urgency: "medium"
)

client.analyzePlant(request: request) { result in
    switch result {
    case .success(let analysis):
        print("Diagnosis: \(analysis.diagnosis)")
        print("Confidence: \(analysis.confidence)%")
    case .failure(let error):
        print("Error: \(error.localizedDescription)")
    }
}
```

### Kotlin (Android) Example

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class CultivAIProClient(
    private val baseUrl: String = "http://localhost:3000"
) {
    private val client = OkHttpClient()

    suspend fun analyzePlant(
        strain: String,
        leafSymptoms: String,
        phLevel: Double? = null,
        temperature: Double? = null,
        humidity: Double? = null,
        medium: String? = null,
        growthStage: String? = null,
        plantImage: String? = null
    ): AnalysisResult {
        val json = JSONObject().apply {
            put("strain", strain)
            put("leafSymptoms", leafSymptoms)
            phLevel?.let { put("phLevel", it) }
            temperature?.let { put("temperature", it) }
            humidity?.let { put("humidity", it) }
            medium?.let { put("medium", it) }
            growthStage?.let { put("growthStage", it) }
            plantImage?.let { put("plantImage", it) }
            put("urgency", "medium")
        }

        val request = Request.Builder()
            .url("$baseUrl/api/analyze")
            .post(json.toString().toRequestBody("application/json".toMediaType()))
            .build()

        return withContext(Dispatchers.IO) {
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw Exception("API request failed: ${response.code}")
                }

                val responseBody = response.body?.string()
                val jsonResponse = JSONObject(responseBody ?: "{}")

                if (jsonResponse.getBoolean("success")) {
                    val analysisJson = jsonResponse.getJSONObject("analysis")
                    parseAnalysisResult(analysisJson)
                } else {
                    throw Exception(jsonResponse.getJSONObject("error").getString("message"))
                }
            }
        }
    }

    private fun parseAnalysisResult(json: JSONObject): AnalysisResult {
        return AnalysisResult(
            diagnosis = json.getString("diagnosis"),
            confidence = json.getInt("confidence"),
            severity = json.getString("severity"),
            healthScore = json.getInt("healthScore"),
            treatment = json.getJSONArray("treatment").let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            }
        )
    }
}

// Usage in Activity/Fragment
class MainActivity : AppCompatActivity() {
    private lateinit var client: CultivAIProClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        client = CultivAIProClient()

        findViewById<Button>(R.id.analyzeButton).setOnClickListener {
            lifecycleScope.launch {
                try {
                    val result = client.analyzePlant(
                        strain = "Granddaddy Purple",
                        leafSymptoms = "Yellowing on lower leaves"
                    )

                    println("Diagnosis: ${result.diagnosis}")
                    println("Confidence: ${result.confidence}%")
                } catch (e: Exception) {
                    println("Error: ${e.message}")
                }
            }
        }
    }
}
```

## React Integration

### Custom Hook

```typescript
import { useState, useCallback } from 'react';
import { CultivAIPro } from './CultivAIProClient';

export const usePlantAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const client = new CultivAIPro();

  const analyze = useCallback(async (request: any) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await client.analyzePlant(request);
      setResult(analysis);
      return analysis;
    } catch (err: any) {
      const errorMessage = err.message || 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { analyze, reset, loading, error, result };
};
```

### Analysis Results Display Component

```tsx
import React from 'react';

interface AnalysisDisplayProps {
  result: any;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
  if (!result) return null;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'green';
    if (confidence >= 60) return 'orange';
    return 'red';
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  };

  return (
    <div className="analysis-results">
      <div className="diagnosis-section">
        <h2>Diagnosis</h2>
        <p className="diagnosis">{result.diagnosis}</p>
      </div>

      <div className="metrics-section">
        <div className="metric">
          <label>Confidence:</label>
          <span style={{ color: getConfidenceColor(result.confidence) }}>
            {result.confidence}%
          </span>
        </div>
        <div className="metric">
          <label>Health Score:</label>
          <span style={{ color: getHealthScoreColor(result.healthScore) }}>
            {result.healthScore}/100
          </span>
        </div>
        <div className="metric">
          <label>Severity:</label>
          <span className={`severity severity-${result.severity}`}>
            {result.severity}
          </span>
        </div>
      </div>

      {result.symptomsMatched && result.symptomsMatched.length > 0 && (
        <div className="symptoms-section">
          <h3>Symptoms Detected</h3>
          <ul>
            {result.symptomsMatched.map((symptom: string, index: number) => (
              <li key={index}>{symptom}</li>
            ))}
          </ul>
        </div>
      )}

      {result.causes && result.causes.length > 0 && (
        <div className="causes-section">
          <h3>Root Causes</h3>
          <ul>
            {result.causes.map((cause: string, index: number) => (
              <li key={index}>{cause}</li>
            ))}
          </ul>
        </div>
      )}

      {result.treatment && result.treatment.length > 0 && (
        <div className="treatment-section">
          <h3>Treatment Recommendations</h3>
          <ol>
            {result.treatment.map((treatment: string, index: number) => (
              <li key={index}>{treatment}</li>
            ))}
          </ol>
        </div>
      )}

      {result.priorityActions && result.priorityActions.length > 0 && (
        <div className="priority-section">
          <h3>Priority Actions</h3>
          <ul className="priority-actions">
            {result.priorityActions.map((action: string, index: number) => (
              <li key={index} className="priority-action">
                <strong>⚡ {action}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

## Webhook Integration

### Webhook Payload

When analysis is completed, the system can send webhook notifications:

```json
{
  "event": "analysis.completed",
  "timestamp": "2025-11-26T10:30:00Z",
  "data": {
    "analysisId": "analysis_123",
    "plantId": "plant_456",
    "diagnosis": "Nitrogen Deficiency",
    "confidence": 92,
    "healthScore": 72,
    "severity": "mild",
    "provider": "openrouter"
  }
}
```

### Receiving Webhooks

```typescript
// Express.js example
import express from 'express';
const app = express();

app.use(express.json());

app.post('/webhook/cultivai-pro', (req, res) => {
  const event = req.body.event;

  switch (event) {
    case 'analysis.completed':
      const analysis = req.body.data;
      console.log('Analysis completed:', analysis.diagnosis);

      // Process the analysis
      processAnalysis(analysis);
      break;

    case 'analysis.failed':
      console.error('Analysis failed:', req.body.error);
      break;
  }

  res.status(200).send('OK');
});

app.listen(3001, () => {
  console.log('Webhook server listening on port 3001');
});
```

### Registering Webhooks

```typescript
async function registerWebhook(webhookUrl: string, events: string[]) {
  const response = await fetch('https://api.cultivaipro.com/api/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      events: events,
    }),
  });

  return response.json();
}

// Register for analysis events
const webhook = await registerWebhook('https://your-app.com/webhook/cultivai-pro', [
  'analysis.completed',
  'analysis.failed'
]);
```

## Third-Party Integrations

### Zapier Integration

1. Create a new Zap
2. Choose "Webhooks by Zapier" as trigger
3. Select "Catch Hook"
4. Copy the webhook URL
5. Use the webhook URL to register with our API
6. Add actions (e.g., send email, Slack notification, update spreadsheet)

```typescript
// Register webhook with Zapier
const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/123456/abcxyz/';

await registerWebhook(zapierWebhookUrl, [
  'analysis.completed',
  'analysis.failed'
]);
```

### Make (Integromat) Integration

1. Create new scenario
2. Add "Webhooks" module
3. Choose "Custom webhook"
4. Set up webhook URL
5. Add subsequent modules for processing

### Discord Bot Integration

```typescript
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!analyze')) {
    const plantInfo = message.content.substring(9);

    try {
      const analysis = await client.analyzePlant({
        strain: 'Unknown',
        leafSymptoms: plantInfo,
      });

      const embed = new EmbedBuilder()
        .setTitle('Plant Analysis Result')
        .addFields(
          { name: 'Diagnosis', value: analysis.diagnosis, inline: true },
          { name: 'Confidence', value: `${analysis.confidence}%`, inline: true },
          { name: 'Health Score', value: analysis.healthScore.toString(), inline: true }
        )
        .setColor(analysis.severity === 'critical' ? 'Red' : 'Green');

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply('Analysis failed: ' + error.message);
    }
  }
});

client.login('YOUR_DISCORD_BOT_TOKEN');
```

### Slack Integration

```typescript
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function sendAnalysisToSlack(analysis: any) {
  await slack.chat.postMessage({
    channel: '#cultivation',
    text: 'Plant Analysis Complete',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Diagnosis:* ${analysis.diagnosis}\n*Confidence:* ${analysis.confidence}%`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Health Score:*\n${analysis.healthScore}/100`
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${analysis.severity}`
          }
        ]
      }
    ]
  });
}
```

## Error Handling

### Comprehensive Error Handler

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function handleAnalysis(
  request: AnalysisRequest
): Promise<AnalysisResult> {
  try {
    return await client.analyzePlant(request);
  } catch (error: any) {
    if (error.code === 'VALIDATION_ERROR') {
      throw new APIError('Invalid input data', 400, 'VALIDATION_ERROR', error.details);
    } else if (error.code === 'RATE_LIMIT_ERROR') {
      throw new APIError('Rate limit exceeded', 429, 'RATE_LIMIT_ERROR', {
        retryAfter: error.retryAfter,
      });
    } else if (error.code === 'AI_PROVIDER_UNAVAILABLE') {
      throw new APIError(
        'AI provider not configured',
        503,
        'AI_PROVIDER_UNAVAILABLE',
        error.recommendations
      );
    } else if (error.code === 'IMAGE_ERROR') {
      throw new APIError('Image processing failed', 413, 'IMAGE_ERROR', error.details);
    } else {
      throw new APIError('Analysis failed', 500, 'INTERNAL_ERROR', error.message);
    }
  }
}
```

### React Error Boundary

```tsx
class AnalysisErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Analysis error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Analysis Error</h2>
          <p>Something went wrong during analysis.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Rate Limiting

### Client-Side Rate Limiting

```typescript
class RateLimitedClient {
  private requests: number[] = [];
  private readonly maxRequests = 20;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    this.cleanup();

    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (Date.now() - this.requests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.cleanup();
    }

    this.requests.push(Date.now());
    return requestFn();
  }

  private cleanup() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
  }
}
```

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors
      if (error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }

      if (i === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage
const analysis = await retryWithBackoff(
  () => client.analyzePlant(request),
  3,
  1000
);
```

## Best Practices

### 1. Input Validation

```typescript
function validateAnalysisRequest(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data.strain || data.strain.trim().length === 0) {
    errors.push('Strain is required');
  }

  if (!data.leafSymptoms || data.leafSymptoms.trim().length === 0) {
    errors.push('Symptoms description is required');
  }

  if (data.phLevel && (data.phLevel < 0 || data.phLevel > 14)) {
    errors.push('pH level must be between 0 and 14');
  }

  if (data.temperature && (data.temperature < -50 || data.temperature > 150)) {
    errors.push('Temperature is out of reasonable range');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 2. Image Optimization

```typescript
async function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Resize to max 1200x1200
      const maxSize = 1200;
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        0.9
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
```

### 3. Caching Results

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number = 3600000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  generateKey(request: any): string {
    const relevantFields = {
      strain: request.strain,
      leafSymptoms: request.leafSymptoms.substring(0, 100), // Truncate for key
      phLevel: request.phLevel,
      temperature: request.temperature,
      humidity: request.humidity,
    };

    return JSON.stringify(relevantFields);
  }
}

const cache = new APICache();

async function analyzeWithCache(request: any): Promise<any> {
  const key = cache.generateKey(request);
  const cached = cache.get(key);

  if (cached) {
    return cached;
  }

  const result = await client.analyzePlant(request);
  cache.set(key, result, 24 * 60 * 60 * 1000); // Cache for 24 hours

  return result;
}
```

### 4. Monitoring & Logging

```typescript
class APIMonitor {
  private metrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    averageResponseTime: 0,
    errors: new Map<string, number>(),
  };

  async trackRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.metrics.requests++;

    try {
      const result = await requestFn();
      this.metrics.successes++;
      this.recordResponseTime(Date.now() - startTime);
      return result;
    } catch (error: any) {
      this.metrics.failures++;
      this.recordError(error);
      throw error;
    }
  }

  private recordResponseTime(time: number) {
    const alpha = 0.1;
    this.metrics.averageResponseTime =
      (1 - alpha) * this.metrics.averageResponseTime + alpha * time;
  }

  private recordError(error: Error) {
    const errorType = (error as any).code || 'UNKNOWN_ERROR';
    this.metrics.errors.set(errorType, (this.metrics.errors.get(errorType) || 0) + 1);
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.successes / this.metrics.requests) * 100,
    };
  }
}

const monitor = new APIMonitor();

// Usage
const analysis = await monitor.trackRequest(() =>
  client.analyzePlant(request)
);

console.log('Metrics:', monitor.getMetrics());
```

### 5. Security Best Practices

```typescript
// Sanitize user input
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocols
    .trim();
}

// Validate image before upload
async function validateImage(file: File): Promise<void> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid image format');
  }

  const maxSize = 50 * 1024 * 1024; // 50MB

  if (file.size > maxSize) {
    throw new Error('Image too large (max 50MB)');
  }
}

// Use HTTPS
const client = new CultivAIPro('https://api.cultivaipro.com');

// Never expose API keys in client-side code
// Always use environment variables
const apiKey = process.env.OPENROUTER_API_KEY;
```

## Conclusion

This integration guide provides comprehensive examples for integrating the CultivAI Pro Photo Analysis API into your applications. Choose the language/framework that best fits your needs, and refer to the examples as a starting point.

For additional support:
- Documentation: https://docs.cultivaipro.com
- GitHub: https://github.com/cultivaipro/cultivai-pro
- Support: support@cultivaipro.com
