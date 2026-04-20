#!/data/data/com.termux/files/usr/bin/python3
"""
CannaAI - Android-Compatible Backend
Simple Python server that works with the React frontend
Provides plant analysis, strains, chat, and sensor APIs
"""

import os
import sys
import json
import base64
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import random

# Configuration
LM_STUDIO_URL = "http://100.68.208.113:1234/v1"
API_KEY = "sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf"
VISION_MODEL = "google/gemma-4-26b-a4b"
TEXT_MODEL = "google/gemma-4-26b-a4b"
PORT = 3000
HOST = "0.0.0.0"

# Deep analysis prompt for cannabis plants
ANALYSIS_PROMPT = """You are an expert cannabis cultivator analyzing a plant. Provide a DEEP, COMPREHENSIVE analysis:

## 1. GROWTH STAGE ASSESSMENT
- Exact stage (seedling/vegetative/early flower/mid flower/late flower/harvest ready)
- Week estimate if in flowering
- Pistil development and color (white/orange/brown)
- Calyx-to-leaf ratio
- Trichome appearance if visible (clear/milky/amber)
- Signs of light stress or light burn

## 2. DETAILED HEALTH SCORE (1-10)
- Root zone health indicators (if visible)
- Stem thickness and structural integrity
- Node spacing (compact/stretching)
- New growth vitality (tips, new leaves)
- Recovery ability from any stress

## 3. COMPREHENSIVE NUTRIENT ANALYSIS
- Nitrogen (N): Leaf color (light green/dark green/yellowing), mobility symptoms
- Phosphorus (P): Purple stems, dark spots on leaves
- Potassium (K): Edge burn, tip curl, brown patches
- Calcium/Magnesium: New growth issues, interveinal chlorosis
- Micronutrients: Iron, manganese, zinc deficiency signs
- Nutrient lockout indicators
- pH stress signs (cliff effect)

## 4. DETAILED PEST & DISEASE排查
- Spider mites: Webbing, tiny dots on leaves, leaf damage
- Aphids: Clusters, sticky residue (honeydew)
- Fungus gnats: Larvae in soil, adult flies
- Thrips: Silvering, black dots, scarred leaves
- Powdery mildew: White powdery spots
- Root rot: Wilting despite moist soil, smell
- Botrytis (bud rot): Gray fuzzy mold in buds
- Fusarium/wilt: Yellowing, drooping, vascular browning

## 5. ENVIRONMENTAL ASSESSMENT
- Light intensity indicators (light bleaching, heat stress)
- Temperature stress (wilting, cupped leaves)
- Humidity issues (crispy edges/low, mold-prone/high)
- Airflow/circulation indicators
- Root zone issues visible in pot

## 6. PLANT GENETICS & VARIETY INDICATORS
- Strain type indicators (sativa/indica/hybrid traits)
- Leaflet shape and structure
- Color pigments (anthocyanins, terpenes)
- Aroma indicators if visible

## 7. SPECIFIC ACTIONABLE RECOMMENDATIONS
- Immediate actions (next 24-48 hours)
- Weekly adjustments
- flushing/pK timing if applicable
- Training techniques to maximize yield
- Harvest timing if approaching readiness

Format with clear headers. Be thorough and technical. Include specific measurements and observations.
"""

class CannaAIHandler(SimpleHTTPRequestHandler):
    """Custom HTTP handler for CannaAI"""
    
    def __init__(self, *args, **kwargs):
        self.directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=self.directory, **kwargs)
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/health':
            self.send_json({'status': 'ok', 'service': 'CannaAI Android', 'version': '1.0.0'})
        elif parsed.path == '/api/models':
            self.send_json(self.get_lmstudio_models())
        elif parsed.path == '/api/strains':
            self.send_json({'strains': self.get_strains()})
        elif parsed.path == '/api/settings':
            self.send_json(self.get_settings())
        elif parsed.path.startswith('/api/history'):
            self.send_json({'history': self.get_history()})
        elif parsed.path == '/api/sensors':
            self.send_json(self.get_sensor_data())
        else:
            super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        parsed = urlparse(self.path)
        
        if parsed.path == '/api/analyze':
            self.handle_analyze()
        elif parsed.path == '/api/chat':
            self.handle_chat()
        elif parsed.path == '/api/capture':
            self.handle_capture()
        elif parsed.path == '/api/strains':
            self.handle_add_strain()
        elif parsed.path == '/api/sensors':
            self.handle_update_sensors()
        elif parsed.path == '/api/settings':
            self.handle_update_settings()
        elif parsed.path == '/api/automation':
            self.handle_automation()
        else:
            self.send_json({'error': 'Not found'}, status=404)
    
    def get_lmstudio_models(self):
        """Get available models from LM Studio"""
        try:
            req = urllib.request.Request(
                f"{LM_STUDIO_URL}/models",
                headers={"Authorization": f"Bearer {API_KEY}"}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            return {'error': str(e), 'models': []}
    
    def get_strains(self):
        """Get predefined strain data"""
        return [
            {
                'id': '1',
                'name': 'Blunt Force Fauna',
                'type': 'Hybrid',
                'lineage': 'Animal Tsunami x Lunch Money #50',
                'description': 'Balanced hybrid with strong genetics',
                'optimalConditions': {
                    'ph': {'range': [6.0, 7.0], 'medium': 'Soil/Soilless'},
                    'temperature': {'veg': [70, 85], 'flower': [65, 80]},
                    'humidity': {'veg': [40, 70], 'flower': [40, 50]}
                }
            }
        ]
    
    def get_settings(self):
        """Get current settings"""
        return {
            'lmStudio': {
                'url': LM_STUDIO_URL,
                'apiKey': API_KEY[:10] + '...' if len(API_KEY) > 10 else API_KEY,
                'visionModel': VISION_MODEL,
                'textModel': TEXT_MODEL
            },
            'theme': 'dark',
            'notifications': True
        }
    
    def get_history(self):
        """Get analysis history"""
        reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
        history = []
        if os.path.exists(reports_dir):
            for f in sorted(os.listdir(reports_dir), reverse=True)[:50]:
                if f.endswith('.txt'):
                    filepath = os.path.join(reports_dir, f)
                    with open(filepath, 'r') as file:
                        content = file.read()
                        history.append({
                            'id': f.replace('.txt', ''),
                            'date': f.replace('.txt', '').replace('_', ' '),
                            'summary': content[:200] + '...' if len(content) > 200 else content
                        })
        return history
    
    def get_sensor_data(self):
        """Get simulated sensor data"""
        return {
            'temperature': round(random.uniform(70, 85), 1),
            'humidity': round(random.uniform(45, 65), 1),
            'soilMoisture': round(random.uniform(40, 80), 1),
            'lightIntensity': round(random.uniform(500, 1000), 0),
            'ph': round(random.uniform(6.0, 7.0), 2),
            'ec': round(random.uniform(1.0, 2.5), 2),
            'vpd': round(random.uniform(0.8, 1.5), 2),
            'co2': round(random.uniform(400, 1200), 0)
        }
    
    def handle_capture(self):
        """Capture photo using termux-camera-photo"""
        try:
            photo_path = "/sdcard/cannaai_capture.jpg"
            os.system(f"termux-camera-photo -c 0 {photo_path}")
            
            if os.path.exists(photo_path):
                size = os.path.getsize(photo_path)
                self.send_json({'success': True, 'path': photo_path, 'size': size})
            else:
                self.send_json({'success': False, 'error': 'Photo capture failed'})
        except Exception as e:
            self.send_json({'success': False, 'error': str(e)})
    
    def handle_analyze(self):
        """Analyze plant image with LM Studio vision"""
        content_length = int(self.headers.get('Content-Length', 0))
        
        if content_length == 0:
            self.send_json({'error': 'No data provided'}, status=400)
            return
        
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Get image (base64 or file path)
            image_data = data.get('plantImage')
            if image_data:
                # It's already base64
                pass
            else:
                # Try file path
                image_path = data.get('imagePath', '/sdcard/plant_check.jpg')
                if os.path.exists(image_path):
                    with open(image_path, 'rb') as f:
                        image_data = base64.b64encode(f.read()).decode()
                else:
                    self.send_json({'error': f'No image provided and file not found: {image_path}'}, status=400)
                    return
            
            # Add context from form data
            context = []
            if data.get('strain'):
                context.append(f"Strain: {data['strain']}")
            if data.get('leafSymptoms'):
                context.append(f"Symptoms: {data['leafSymptoms']}")
            if data.get('growthStage'):
                context.append(f"Growth Stage: {data['growthStage']}")
            if data.get('phLevel'):
                context.append(f"pH Level: {data['phLevel']}")
            if data.get('temperature'):
                context.append(f"Temperature: {data['temperature']}")
            if data.get('humidity'):
                context.append(f"Humidity: {data['humidity']}")
            
            prompt = ANALYSIS_PROMPT
            if context:
                prompt += f"\n\nContext from grower:\n" + "\n".join(context)
            
            # Send to LM Studio
            url = f"{LM_STUDIO_URL}/responses"
            payload = {
                "model": VISION_MODEL,
                "input": [{
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": f"data:image/png;base64,{image_data}"}
                    ]
                }]
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode(),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {API_KEY}"
                }
            )
            
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read().decode())
                analysis_text = result.get('output', [{}])[0].get('content', [{}])[0].get('text', '')
                
                # Save report
                self.save_report(analysis_text, data)
                
                # Return in expected format
                self.send_json({
                    'analysis': {
                        'diagnosis': analysis_text,
                        'healthScore': self.extract_health_score(analysis_text),
                        'urgency': 'medium',
                        'confidence': 0.85,
                        'recommendations': self.extract_recommendations(analysis_text)
                    },
                    'metadata': {
                        'provider': 'lmstudio',
                        'model': VISION_MODEL,
                        'timestamp': datetime.now().isoformat()
                    }
                })
                
        except json.JSONDecodeError:
            self.send_json({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            self.send_json({'error': str(e)}, status=500)
    
    def extract_health_score(self, text):
        """Extract health score from analysis text"""
        import re
        match = re.search(r'(\d+)\s*/\s*10', text)
        if match:
            return int(match.group(1))
        # Look for "8/10" or "Health: 8" patterns
        match = re.search(r'[Hh]ealth[^0-9]*(\d+)', text)
        if match:
            return int(match.group(1))
        return 7  # default
    
    def extract_recommendations(self, text):
        """Extract recommendations from analysis text"""
        import re
        recs = []
        # Look for recommendation sections
        match = re.search(r'[Rr]ecommendations?[:\s]*([\s\S]+)$', text)
        if match:
            rec_text = match.group(1)
            lines = [l.strip() for l in rec_text.split('\n') if l.strip()]
            for line in lines[:5]:
                if len(line) > 10:
                    recs.append(line)
        return recs if recs else ['Monitor plant health', 'Check pH levels', 'Ensure proper lighting']
    
    def handle_chat(self):
        """Handle chat messages"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        
        message = data.get('message', '')
        
        # Use LM Studio for chat
        url = f"{LM_STUDIO_URL}/chat/completions"
        payload = {
            "model": TEXT_MODEL,
            "messages": [
                {"role": "system", "content": "You are an expert cannabis cultivation assistant. Provide helpful, accurate advice about growing cannabis."},
                {"role": "user", "content": message}
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {API_KEY}"
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode())
                response_text = result['choices'][0]['message']['content']
                self.send_json({
                    'response': response_text,
                    'metadata': {'provider': 'lmstudio', 'model': TEXT_MODEL}
                })
        except Exception as e:
            self.send_json({'response': f'Error: {str(e)}'}, status=500)
    
    def handle_add_strain(self):
        """Add a new strain"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        data['id'] = str(random.randint(1000, 9999))
        self.send_json(data)
    
    def handle_update_sensors(self):
        """Update sensor data"""
        self.send_json({'success': True})
    
    def handle_update_settings(self):
        """Update settings"""
        self.send_json({'success': True})
    
    def handle_automation(self):
        """Handle automation commands"""
        self.send_json({'success': True, 'message': 'Automation command received'})
    
    def save_report(self, analysis, data=None):
        """Save analysis to reports directory"""
        report_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
        os.makedirs(report_dir, exist_ok=True)
        
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        filepath = os.path.join(report_dir, filename)
        
        with open(filepath, 'w') as f:
            f.write(f"CannaAI Plant Analysis Report\n")
            f.write(f"Generated: {datetime.now()}\n")
            f.write(f"Model: {VISION_MODEL}\n")
            if data:
                f.write(f"Strain: {data.get('strain', 'Unknown')}\n")
                f.write(f"Stage: {data.get('growthStage', 'Unknown')}\n")
            f.write("=" * 50 + "\n\n")
            f.write(analysis)
        
        print(f"📄 Report saved: {filepath}")
    
    def send_json(self, data, status=200):
        """Send JSON response"""
        response = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(response))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(response)
    
    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[CannaAI] {args[0]}")

def main():
    """Start the CannaAI server"""
    print(f"""
╔══════════════════════════════════════════════╗
║         🌱 CannaAI - Android Backend         ║
╠══════════════════════════════════════════════╣
║  LM Studio: {LM_STUDIO_URL}           ║
║  Vision: {VISION_MODEL}                     ║
║  Text: {TEXT_MODEL}                     ║
║  Server: http://{HOST}:{PORT}                ║
╚══════════════════════════════════════════════╝
    """)
    
    handler = lambda *args, **kwargs: CannaAIHandler(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
    server = HTTPServer((HOST, PORT), CannaAIHandler)
    
    print(f"🚀 CannaAI server running on http://{HOST}:{PORT}")
    print(f"📸 Capture: POST /api/capture")
    print(f"🧠 Analyze: POST /api/analyze")
    print(f"💬 Chat: POST /api/chat")
    print(f"❤️  Health: GET /api/health")
    print(f"\nPress Ctrl+C to stop\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down CannaAI server...")
        server.shutdown()

if __name__ == "__main__":
    main()
