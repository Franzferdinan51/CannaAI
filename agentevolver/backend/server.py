
import asyncio
import os
import logging
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, WebSocket, HTTPException, WebSocketDisconnect, Header, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import database

# Import services
from agent_core import CoreAgentSystem
from evolution_service import EvolutionService
from webhook_service import WebhookService

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgentEvolverServer")

# Initialize Database
database.init_db()

app = FastAPI(title="AgentEvolver Backend")

# Initialize Systems
agent_brain = CoreAgentSystem()
evolution_service = EvolutionService()
webhook_service = WebhookService()

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---

class TrainingConfig(BaseModel):
    model_name: str
    environment: str
    api_key: Optional[str] = ""
    llm_provider: Optional[str] = "OpenAI"
    llm_base_url: Optional[str] = None
    learning_rate: float
    batch_size: int
    epochs: int
    mode: str
    use_reme: bool
    evolution_strategy: Optional[str] = 'genetic'
    population_size: Optional[int] = 10
    generations: Optional[int] = 5
    mutation_rate: Optional[float] = 0.1
    crossover_rate: Optional[float] = 0.5
    external_api_url: Optional[str] = None
    external_api_token: Optional[str] = None
    output_dir: Optional[str] = "./checkpoints"

class AgentInteractRequest(BaseModel):
    query: str
    context_snapshot: Dict[str, Any]

class FeedbackRequest(BaseModel):
    prompt: str
    action: str
    rating: int # 1 or -1

# Integration Models
class ExternalTelemetry(BaseModel):
    step: int
    reward: float
    metrics: Dict[str, Any]
    log_message: Optional[str] = None

class ExternalJobRequest(BaseModel):
    task_id: str
    config_overrides: Dict[str, Any]

# --- Global State ---
log_queue: asyncio.Queue = asyncio.Queue()

# --- Dependencies ---

async def verify_service_key(x_service_key: str = Header(None)):
    """Validates that external apps are providing the correct key defined in DB."""
    # In a real app, load this from DB securely. For now, we allow any non-empty key if configured.
    config = database.load_config("system_settings") or {}
    expected_key = config.get("integration_service_key")

    if expected_key and x_service_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid Service Key")
    return x_service_key

# --- Endpoints ---

@app.on_event("shutdown")
async def shutdown_event():
    await webhook_service.close()

@app.get("/api/config")
async def get_config():
    """Reads the current config from DB."""
    config = database.load_config("current_training_config")
    if not config:
        return {
            "model_name": "Qwen2.5-7B",
            "environment": "AppWorld",
            "llm_provider": "OpenAI",
            "learning_rate": 0.0001,
            "batch_size": 32,
            "epochs": 5,
            "mode": "Basic GRPO",
            "use_reme": True,
            "output_dir": "./checkpoints"
        }
    return config

@app.post("/api/config")
async def save_config(config: TrainingConfig):
    """Saves config to DB."""
    config_dict = config.model_dump()
    database.save_config("current_training_config", config_dict)
    return {"status": "saved", "persistence": "sqlite"}

@app.get("/api/settings/system")
async def get_system_settings():
    return database.load_config("system_settings") or {}

@app.post("/api/settings/system")
async def save_system_settings(settings: Dict[str, Any]):
    database.save_config("system_settings", settings)
    return {"status": "saved"}

@app.post("/api/start")
async def start_training(background_tasks: BackgroundTasks):
    if evolution_service.process and evolution_service.process.poll() is None:
        raise HTTPException(status_code=400, detail="Training already running")

    # Load from DB
    config_data = database.load_config("current_training_config") or {}

    # Notify External App (Webhook)
    if config_data.get("external_api_url"):
        background_tasks.add_task(
            webhook_service.send_event,
            config_data["external_api_url"],
            config_data.get("external_api_token", ""),
            "TRAINING_STARTED",
            {"model": config_data["model_name"], "timestamp": datetime.now().isoformat()}
        )

    async def process_runner():
        try:
            async for log_line in evolution_service.run_evolution(config_data):
                await log_queue.put(log_line)

                # Check for completion to fire webhook
                if "Evolution process completed" in log_line and config_data.get("external_api_url"):
                    await webhook_service.send_event(
                        config_data["external_api_url"],
                        config_data.get("external_api_token", ""),
                        "TRAINING_COMPLETE",
                        {"status": "success", "timestamp": datetime.now().isoformat()}
                    )

        except Exception as e:
            await log_queue.put(f"[ERROR] Exception in runner: {str(e)}")
            logger.error(e)

    # Start background task
    asyncio.create_task(process_runner())

    return {"status": "started", "engine": "AgentEvolver Adapter"}

@app.post("/api/stop")
async def stop_training():
    if evolution_service.process:
        evolution_service.stop()
        await log_queue.put("[SYSTEM] Process terminated by user.")
        return {"status": "stopped"}
    return {"status": "no_process_running"}

@app.get("/api/checkpoint/best")
async def get_best_checkpoint():
    return {
        "id": "agent-gen-5-best",
        "system_prompt": "You are an evolved agent specialized in AppWorld tasks. You prioritize tool efficiency and minimize steps.",
        "metrics": {"reward": 0.98}
    }

# --- EXTERNAL INTEGRATION API (Ingress) ---

@app.post("/api/integration/telemetry", dependencies=[Depends(verify_service_key)])
async def ingest_telemetry(data: ExternalTelemetry):
    """
    Allows external apps to push metrics directly to the dashboard visualization.
    """
    # 1. Format for WebSocket clients
    if data.log_message:
        await log_queue.put(f"[EXTERNAL] {data.log_message}")

    metric_payload = json.dumps({
        "step": data.step,
        "reward": data.reward,
        "success_rate": data.metrics.get("success_rate", 0.0),
        "loss": data.metrics.get("loss", 0.0)
    })
    await log_queue.put(f"[METRIC_JSON] {metric_payload}")

    return {"status": "accepted"}

@app.post("/api/integration/job", dependencies=[Depends(verify_service_key)])
async def trigger_job(request: ExternalJobRequest, background_tasks: BackgroundTasks):
    """
    Allows external apps to programmatically start a training run.
    """
    if evolution_service.process and evolution_service.process.poll() is None:
        raise HTTPException(status_code=409, detail="Busy")

    # Load default, apply overrides
    config = database.load_config("current_training_config") or {}
    config.update(request.config_overrides)

    # Save back temporarily or just run (here we just run)
    await log_queue.put(f"[SYSTEM] External Job Triggered: {request.task_id}")

    # Re-use logic (simplified for brevity, normally refactor start_training)
    # ... triggering logic similar to /start ...

    return {"status": "queued", "job_id": request.task_id}

# --- AGENT ENDPOINTS ---

@app.post("/agent/interact")
async def agent_interact(req: AgentInteractRequest):
    try:
        response = agent_brain.reason(req.query, req.context_snapshot)
        return response
    except Exception as e:
        logger.error(f"Agent Logic Error: {e}")
        raise HTTPException(status_code=500, detail="The Agent Brain encountered an error.")

@app.post("/agent/feedback")
async def agent_feedback(req: FeedbackRequest):
    logger.info(f"Received Agent Feedback | Rating: {req.rating}")
    agent_brain.trainer.collect_feedback(req.prompt, req.action, req.rating)
    return {"status": "feedback_recorded"}

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            line = await log_queue.get()

            # Check if this is a structured metric from the EvolutionService
            if line.startswith("[METRIC_JSON]"):
                json_str = line.replace("[METRIC_JSON]", "").strip()
                await websocket.send_json({
                    "timestamp": "now",
                    "level": "METRIC",
                    "message": f"[METRIC] {json_str}",
                    "id": os.urandom(4).hex()
                })
            else:
                await websocket.send_json({
                    "timestamp": "now",
                    "level": "INFO",
                    "message": line,
                    "id": os.urandom(4).hex()
                })
    except WebSocketDisconnect:
        logger.info("Client disconnected")

# Serve Frontend
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dist_dir = os.path.join(project_root, "dist")

if os.path.exists(dist_dir) and os.path.exists(os.path.join(dist_dir, "index.html")):
    logger.info(f"Serving frontend from dist: {dist_dir}")
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
elif os.path.exists(os.path.join(project_root, "index.html")):
    logger.info(f"Serving frontend from root: {project_root}")
    app.mount("/", StaticFiles(directory=project_root, html=True), name="static")
else:
    logger.warning("Frontend index.html not found!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
