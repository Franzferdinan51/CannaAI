
# 🧬 AgentEvolver Dashboard

**The Ultimate MLOps & Observability Platform for Autonomous AI Agents.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Tech](https://img.shields.io/badge/stack-React_19_|_FastAPI_|_Gemini-violet)
![Python](https://img.shields.io/badge/python-3.9+-yellow.svg)
![Local AI](https://img.shields.io/badge/support-Ollama_|_LM_Studio-green)

**AgentEvolver Dashboard** is a cutting-edge, mission-control interface designed to bridge the gap between complex evolutionary training frameworks (specifically **ModelScope AgentEvolver**) and human operators. It provides a unified, real-time environment for configuring, training, monitoring, and interacting with evolving large language model (LLM) agents.

It transforms static training scripts into a **Two-Way API Gateway**, allowing external applications (Games, Trading Bots, Simulations) to push telemetry and receive evolved agent policies dynamically.

---

## ✨ Key Features

### 🧠 Advanced Agent Training & Evolution
- **Genetic Algorithms (GA):** Native support for configuring population size, mutation rates, and crossover strategies to evolve agent prompts and weights.
- **AutoTrain Pipeline:** A wizard-style interface to set up Supervised Fine-Tuning (SFT), DPO (Direct Preference Optimization), or full Evolutionary tasks without writing code.
- **Real-time Telemetry:** Monitor Reward curves, Success Rates, and Loss metrics with millisecond-latency via WebSockets.
- **Visual Memory Inspector:** Debug agent trajectories step-by-step, visualizing the chain of thought, tool usage, and environmental feedback.

### 🔓 Local & Private AI Support
- **Bring Your Own Model (BYOM):** Native integration with local inference servers like **Ollama**, **LM Studio**, **vLLM**, or **LocalAI**.
- **Offline Evolution:** Run genetic algorithms and training loops entirely on your local hardware (GPU required) without API costs or privacy concerns.
- **OpenAI-Compatible:** Supports any provider that adheres to the OpenAI Chat Completions API standard (configure via Base URL in Settings).

### 💎 Gemini & Multimodal Integration
- **Deep Reasoning MRI:** Visualize the agent's hidden "thought process" using the **Agent MRI** component (powered by Gemini 3 Thinking Mode).
- **Generative Media Studio:** Create and manage assets using **Veo** (Video Generation) and **Imagen 3** (High-Fidelity Image Generation) directly from the chat.
- **Gemini Live API:** Engage in real-time, low-latency voice conversations with your agents for natural language debugging and alignment.

### 🔌 External Integration Gateway
- **Ingress API:** Push metrics, logs, and rewards from external applications (e.g., Unity, Unreal Engine, Custom Python Scripts) directly to the dashboard visualization.
- **Egress Webhooks:** Configure webhooks to notify your external infrastructure when training starts, epochs complete, or new checkpoints are saved.
- **Secure Auth:** Manage Service Keys and Webhook Secrets via the Settings UI.

### 🕹️ "God Mode" & Omnibar
- **Natural Language Control:** Use the Agent Omnibar to control the dashboard itself. Command it: *"Update learning rate to 0.005, switch to the CyberSec environment, and start training."*
- **Matrix Console:** A cyberpunk-styled log viewer with "Zen Mode" and a real-time Human Feedback slider for RLHF signal injection.

### 💾 Persistence & Infrastructure
- **SQLite Core:** All configurations, chat history, and agent memories are persisted in a local `agent_evolver.db`.
- **Containerized Deployment:** Fully dockerized for easy deployment.
- **Windows Bundle:** Includes a `start.bat` for instant setup on Windows machines.

---

## 🛠️ Technical Architecture

The system follows a modern decoupled architecture:

### Frontend (Client)
- **Framework:** React 19 (via ES Modules/ESM.sh - No Build Step Required).
- **UI Library:** TailwindCSS for styling, Lucide React for iconography.
- **Visualization:** Recharts for real-time training curves.
- **State Management:** Local React State + WebSocket Hydration.

### Backend (Server)
- **Runtime:** Python FastAPI (Async/Await).
- **Database:** SQLite (Embedded via `sqlite3`).
- **Core Library Bridge:** A custom **Shim Layer** (`agent_evolver_shim.py`) acts as the interface between the dashboard and the installed `modelscope/AgentEvolver` library. It handles configuration translation, execution monitoring, and automatic fallback to simulation if the library is missing.
- **Services:**
    - `EvolutionService`: Manages subprocesses for the heavy ML training loops.
    - `GeminiService`: Handles all Google AI interactions (Thinking, Live, Veo).
    - `WebhookService`: Asynchronous event dispatcher for external integrations.

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.9+** (if running manually)
- **Git** (Required to fetch the AgentEvolver library).
- **Google Cloud API Key** (Required *only* for Chat, Media, and Live features).
- **Local LLM Runner** (Optional: LM Studio/Ollama if running offline).
- **Docker** (Optional, for containerized run).

### ⚡ Quick Start (Windows)
We provide a unified launcher script for Windows users that handles the entire setup lifecycle.

1.  **Clone the repo** (ensure Git is in your PATH).
2.  Double-click `start.bat`.
3.  **What happens next:**
    *   Creates a local Python virtual environment (`.venv`).
    *   Installs dashboard dependencies (`FastAPI`, `Uvicorn`, etc.).
    *   **Automatically pulls and installs** the [ModelScope AgentEvolver](https://github.com/modelscope/AgentEvolver) core library from GitHub.
    *   Launches the server at `http://localhost:8000`.

*Note: If the installer cannot access GitHub or the library installation fails, the dashboard will launch in **Simulation Mode**, using a mock training loop for demonstration purposes.*

### 🐳 Option A: Docker (Cross-Platform)

Run the entire stack (Frontend + Backend + DB) with a single command.

1.  Create a `.env` file (optional) or export your key:
    ```bash
    export API_KEY="your_google_api_key"
    ```

2.  Build and Run:
    ```bash
    docker-compose up --build
    ```

3.  Access the dashboard at `http://localhost:8000`.

### 🛠️ Option B: Manual Setup (Linux/Mac)

1.  **Backend Setup**
    ```bash
    cd backend
    python3 -m venv .venv
    source .venv/bin/activate

    # Install Dashboard Dependencies
    pip install -r requirements.txt

    # Install ModelScope AgentEvolver Core
    pip install "git+https://github.com/modelscope/AgentEvolver.git"

    # Run server (Auto-reloads on change)
    uvicorn server:app --reload --host 0.0.0.0 --port 8000
    ```

2.  **Frontend Setup**
    Since the backend is configured to serve static files from the root, simply navigate to `http://localhost:8000`.

---

## 🔌 Integration Guide

AgentEvolver Dashboard isn't just a viewer; it's a hub. Connect your external apps using the Integration API.

### 1. Enable Integration
Go to **Settings > Developer API & Integration**.
- Note your **Service API Key** (e.g., `8f3...`).
- Set your **Webhook URL** if you want callbacks.

### 2. Push Telemetry (Ingress)
Send metrics from your custom environment (e.g., a Python trading bot):

```bash
curl -X POST http://localhost:8000/api/integration/telemetry \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_SERVICE_KEY" \
  -d '{
    "step": 150,
    "reward": 0.85,
    "metrics": { "success_rate": 0.4, "loss": 0.12 },
    "log_message": "Agent successfully executed trade #42"
  }'
```

---

## 📖 Usage Scenarios

### Scenario A: Evolving a Game Agent
1.  Select **Configuration** -> **Retro Gaming (PyBoy)** -> **Pokemon Red**.
2.  Set **Evolution Strategy** to "Genetic Algorithm".
3.  Start Training.
4.  Watch the **Memory Inspector** to see how the agent learns to navigate the map.
5.  Use the **Human Feedback** slider in the Log Console to manually penalize "stuck" behavior.

### Scenario B: Offline Privacy Mode (Local AI)
1.  Start **LM Studio** or **Ollama** (e.g., `ollama run llama3`).
2.  In Dashboard, go to **Settings > Primary Chat Provider**.
3.  Select **Ollama** or **LM Studio**.
4.  Set Base URL (e.g., `http://localhost:11434/v1`).
5.  The dashboard will now use your local GPU for all reasoning and training tasks. No data leaves your machine.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
