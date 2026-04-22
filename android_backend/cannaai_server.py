#!/data/data/com.termux/files/usr/bin/python3
"""
CannaAI - Android-Compatible Backend
Simple Python server that works with the React frontend
Provides plant analysis, strains, chat, and sensor APIs

KEY: Uses curl subprocess for LM Studio calls (urllib hangs on Termux).
     Uses qwen3.5-0.8b for vision (gemma-4-26b-a4b hangs on API calls from Termux).
"""

import os, sys, json, base64, subprocess, re
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from datetime import datetime
import random

# Configuration
LM_STUDIO_URL = "http://100.68.208.113:1234/v1"
API_KEY = "sk-lm-xWvfQHZF:L8P76SQakhEA95U8DDNf"
VISION_MODEL = "qwen3.6-35b-a3b"   # qwen3.6-35b works via curl subprocess on Termux API calls
TEXT_MODEL = "qwen3.6-35b-a3b"
PORT = 3000
HOST = "0.0.0.0"

ANALYSIS_PROMPT = """You are an expert cannabis cultivator analyzing a plant photo. Provide:

## 1. GROWTH STAGE ASSESSMENT
- CRITICAL: The plant is in VEGETATIVE STAGE unless clear flowering signs (white pistils, bud formation, flowering trichomes) are visible
- If flowering signs are ambiguous, default to VEGETATIVE
- Exact stage (seedling/vegetative/early flower/mid flower/late flower/harvest ready)
- Week estimate if flowering
- Pistil development and color
- Signs of light stress

## 2. HEALTH SCORE (1-10)
- Root zone health
- Stem thickness and structure
- Node spacing
- New growth vitality

## 3. NUTRIENT ANALYSIS
- Nitrogen (N): Leaf color, mobility symptoms
- Phosphorus (P): Purple stems, dark spots
- Potassium (K): Edge burn, tip curl
- Ca/Mg: New growth issues
- Micronutrients deficiencies

## 4. PEST & DISEASE CHECK
- Spider mites, aphids, fungus gnats, thrips
- Powdery mildew, root rot, botrytis

## 5. ENVIRONMENTAL ASSESSMENT
- Light intensity, temperature stress
- Humidity issues, airflow

## 6. RECOMMENDATIONS
- Immediate actions (24-48h)
- Weekly adjustments
- Harvest timing if approaching readiness

Be thorough and specific. Format with headers."""


class CannaAIHandler(SimpleHTTPRequestHandler):
    
    def __init__(self, *args, **kwargs):
        self.directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, directory=self.directory, **kwargs)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/health':
            self.send_json({'status': 'ok', 'service': 'CannaAI Android', 'version': '1.0.1'})
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
    
    def lm_chat(self, prompt, image_b64=None, max_tokens=4096, temp=0.3):
        """Call LM Studio via curl subprocess (NOT urllib - urllib hangs on Termux)"""
        if image_b64:
            messages = [
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]}
            ]
        else:
            messages = [{"role": "user", "content": prompt}]
        
        payload = {
            "model": VISION_MODEL if image_b64 else TEXT_MODEL,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temp,
            "stream": False
        }
        
        tmp_dir = os.environ.get('TMPDIR', '/data/data/com.termux/files/usr/tmp')
        req_file = f"{tmp_dir}/lm_req_{os.getpid()}.json"
        resp_file = f"{tmp_dir}/lm_resp_{os.getpid()}.json"
        
        with open(req_file, 'w') as f:
            json.dump(payload, f)
        
        try:
            r = subprocess.run([
                "curl", "-s", "--max-time", "120",
                "-X", "POST",
                f"{LM_STUDIO_URL}/chat/completions",
                "-H", "Content-Type: application/json",
                "-H", f"Authorization: Bearer {API_KEY}",
                "--data-binary", f"@{req_file}"
            ], capture_output=True, timeout=130, text=True)
            
            with open(resp_file, 'w') as f:
                f.write(r.stdout)
            
            with open(resp_file) as f:
                result = json.load(f)
            
            os.remove(req_file)
            os.remove(resp_file)
            
            if 'error' in result:
                return None, result['error']
            
            msg = result['choices'][0]['message']
            # qwen3.6-35b puts reasoning in reasoning_content, response in content
            text = msg.get('reasoning_content') or msg.get('content') or ''
            if not text:
                text = msg.get('content', '')
            return text, None
            
        except subprocess.TimeoutExpired:
            os.remove(req_file)
            if os.path.exists(resp_file):
                os.remove(resp_file)
            return None, "LM Studio timeout"
        except Exception as e:
            os.remove(req_file)
            if os.path.exists(resp_file):
                os.remove(resp_file)
            return None, str(e)
    
    def get_lmstudio_models(self):
        try:
            r = subprocess.run([
                "curl", "-s", "--max-time", "10",
                f"{LM_STUDIO_URL}/models",
                "-H", f"Authorization: Bearer {API_KEY}"
            ], capture_output=True, timeout=15, text=True)
            return json.loads(r.stdout)
        except:
            return {'error': 'Failed to get models'}
    
    def get_strains(self):
        return [{'id': '1', 'name': 'Blunt Force Fauna', 'type': 'Hybrid',
                 'lineage': 'Animal Tsunami x Lunch Money #50',
                 'description': 'Balanced hybrid with strong genetics',
                 'optimalConditions': {
                     'ph': {'range': [6.0, 7.0], 'medium': 'Soil/Soilless'},
                     'temperature': {'veg': [70, 85], 'flower': [65, 80]},
                     'humidity': {'veg': [40, 70], 'flower': [40, 50]}
                 }}]
    
    def get_settings(self):
        return {'lmStudio': {'url': LM_STUDIO_URL, 'visionModel': VISION_MODEL, 'textModel': TEXT_MODEL},
                'theme': 'dark', 'notifications': True}
    
    def get_history(self):
        reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
        history = []
        if os.path.exists(reports_dir):
            for f in sorted(os.listdir(reports_dir), reverse=True)[:50]:
                if f.endswith('.txt'):
                    with open(os.path.join(reports_dir, f)) as file:
                        history.append({'id': f.replace('.txt',''), 'date': f.replace('.txt','').replace('_',' '), 'summary': file.read()[:200]})
        return {'history': history}
    
    def get_sensor_data(self):
        return {'temperature': round(random.uniform(70, 85), 1), 'humidity': round(random.uniform(45, 65), 1),
                'soilMoisture': round(random.uniform(40, 80), 1), 'lightIntensity': round(random.uniform(500, 1000), 0),
                'ph': round(random.uniform(6.0, 7.0), 2), 'ec': round(random.uniform(1.0, 2.5), 2),
                'vpd': round(random.uniform(0.8, 1.5), 2), 'co2': round(random.uniform(400, 1200), 0)}
    
    def handle_capture(self):
        photo_path = "/sdcard/cannaai_capture.jpg"
        r = subprocess.run(["termux-camera-photo", "-c", "0", photo_path], capture_output=True)
        if os.path.exists(photo_path):
            self.send_json({'success': True, 'path': photo_path, 'size': os.path.getsize(photo_path)})
        else:
            self.send_json({'success': False, 'error': 'Photo capture failed'})
    
    def handle_analyze(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            self.send_json({'error': 'No data provided'}, status=400)
            return
        
        try:
            body = self.rfile.read(content_length)
            data = json.loads(body)
            
            # Get image (base64 or file path)
            image_data = data.get('plantImage')
            image_format = 'jpeg'
            
            if not image_data:
                image_path = data.get('imagePath', '/sdcard/plant_check.jpg')
                if os.path.exists(image_path):
                    # Resize with ffmpeg to max 1024px
                    temp_path = f"/sdcard/cannaai_temp_{os.getpid()}.jpg"
                    r = subprocess.run([
                        "ffmpeg", "-i", image_path,
                        "-vf", "scale=1024:1024:force_original_aspect_ratio=decrease",
                        "-q:v", "5", "-y", temp_path
                    ], capture_output=True, timeout=30)
                    
                    if r.returncode == 0:
                        with open(temp_path, 'rb') as f:
                            image_data = base64.b64encode(f.read()).decode()
                        os.remove(temp_path)
                    else:
                        with open(image_path, 'rb') as f:
                            image_data = base64.b64encode(f.read()).decode()
                else:
                    self.send_json({'error': f'Image not found: {image_path}'}, status=400)
                    return
            
            # Build context
            ctx = []
            for key in ['strain', 'leafSymptoms', 'growthStage', 'phLevel', 'temperature', 'humidity']:
                if data.get(key):
                    ctx.append(f"{key}: {data[key]}")
            prompt = ANALYSIS_PROMPT
            if ctx:
                prompt += f"\n\nContext: {', '.join(ctx)}"
            
            # Call LM Studio via curl
            analysis_text, error = self.lm_chat(prompt, image_data)
            
            if error:
                self.send_json({'error': f'LM Studio error: {error}'}, status=500)
                return
            
            # Extract health score
            health = 7
            m = re.search(r'(\d+)\s*/\s*10', analysis_text)
            if m:
                health = int(m.group(1))
            
            # Save report
            self.save_report(analysis_text, data)
            
            self.send_json({
                'analysis': {
                    'diagnosis': analysis_text,
                    'healthScore': health,
                    'urgency': 'medium',
                    'confidence': 0.85,
                    'recommendations': self.extract_recs(analysis_text)
                },
                'metadata': {'provider': 'lmstudio', 'model': VISION_MODEL, 'timestamp': datetime.now().isoformat()}
            })
            
        except json.JSONDecodeError:
            self.send_json({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            self.send_json({'error': str(e)}, status=500)
    
    def extract_recs(self, text):
        recs = []
        m = re.search(r'[Rr]ecommendations?[:\s]*([\s\S]+)$', text)
        if m:
            for line in m.group(1).split('\n')[:5]:
                line = line.strip()
                if len(line) > 10:
                    recs.append(line)
        return recs if recs else ['Monitor health', 'Check pH', 'Ensure proper lighting']
    
    def handle_chat(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        message = data.get('message', '')
        
        system = "You are an expert cannabis cultivation assistant."
        response_text, error = self.lm_chat(
            f"{system}\n\nUser: {message}",
            max_tokens=800, temp=0.7
        )
        
        if error:
            self.send_json({'response': f'Error: {error}'}, status=500)
        else:
            self.send_json({'response': response_text, 'metadata': {'provider': 'lmstudio', 'model': TEXT_MODEL}})
    
    def handle_add_strain(self):
        content_length = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(content_length))
        data['id'] = str(random.randint(1000, 9999))
        self.send_json(data)
    
    def handle_update_sensors(self):
        self.send_json({'success': True})
    
    def handle_update_settings(self):
        self.send_json({'success': True})
    
    def handle_automation(self):
        self.send_json({'success': True, 'message': 'Automation command received'})
    
    def save_report(self, analysis, data=None):
        reports_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        with open(os.path.join(reports_dir, f'{ts}.txt'), 'w') as f:
            f.write(f"CannaAI - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Strain: {data.get('strain') if data else 'Unknown'}\n")
            f.write(f"Stage: {data.get('growthStage') if data else 'Unknown'}\n")
            f.write("=" * 50 + "\n\n")
            f.write(analysis)
    
    def send_json(self, data, status=200):
        response = json.dumps(data)
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', len(response))
        self.end_headers()
        self.wfile.write(response.encode())
    
    def log_message(self, format, *args):
        pass


def run_server():
    server = HTTPServer((HOST, PORT), CannaAIHandler)
    print(f'CannaAI running on http://{HOST}:{PORT}')
    print(f'Vision: {VISION_MODEL} | Text: {TEXT_MODEL}')
    server.serve_forever()


if __name__ == '__main__':
    run_server()
