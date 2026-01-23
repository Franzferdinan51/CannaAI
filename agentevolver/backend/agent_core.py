
import json
import os
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
import database

# --- 1. The Cortex (Memory & State) ---

class ContextManager:
    def __init__(self):
        self.short_term_memory = []

    def embed_interaction(self, user_input: str, system_response: str, success: bool):
        """
        Stores interaction in SQLite database.
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "prompt": user_input,
            "completion": system_response,
            "success": success
        }

        # 1. Update Short Term (RAM)
        self.short_term_memory.append(entry)
        if len(self.short_term_memory) > 10:
            self.short_term_memory.pop(0)

        # 2. Update Long Term (DB)
        database.add_history_item(user_input, system_response, success, meta={"source": "agent_core"})

    def retrieve_context(self, query: str) -> List[str]:
        """
        Simple retrieval from DB (Recent items) + Short Term RAM
        """
        relevant = []

        # Check RAM first
        for item in reversed(self.short_term_memory):
            if any(word in item['prompt'].lower() for word in query.lower().split()):
                relevant.append(f"Recent Action: {item['completion']} (Result: {'Success' if item['success'] else 'Fail'})")

        # If not enough, could check DB (simplified here to just RAM for speed in this logic)
        return relevant[:3]

# --- 2. The Effectors (Tool Registry) ---

class ToolRegistry:
    def __init__(self):
        self.tools = {}

    def register(self, func):
        """Decorator to register a function as an agent tool."""
        schema = {
            "name": func.__name__,
            "doc": func.__doc__,
        }
        self.tools[func.__name__] = func
        return func

    def get_tool_list(self):
        return [k for k in self.tools.keys()]

# --- 3. The Evolution Engine (Training) ---

class ModelTrainer:
    def __init__(self):
        self.dataset_path = "training_data/finetune_dataset.jsonl"
        os.makedirs("training_data", exist_ok=True)
        self.collection_buffer = []

    def collect_feedback(self, prompt: str, action: str, rating: int):
        """
        Collects RLHF data. Rating: 1 (Good) or -1 (Bad).
        """
        if rating > 0:
            data = {"messages": [
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": action}
            ]}

            with open(self.dataset_path, "a") as f:
                f.write(json.dumps(data) + "\n")

            self.collection_buffer.append(data)

            # Trigger Training Threshold
            if len(self.collection_buffer) >= 10:
                self.trigger_optimization_job()

    def trigger_optimization_job(self):
        """
        Simulates kicking off a LoRA fine-tuning job on the local GPU.
        """
        print(f"[Self-Training] Threshold reached. Starting background fine-tuning on {len(self.collection_buffer)} new examples...")
        self.collection_buffer = [] # Reset buffer

# --- 4. The Agent Brain (Orchestrator) ---

class CoreAgentSystem:
    def __init__(self):
        self.context_manager = ContextManager()
        self.trainer = ModelTrainer()
        self.tools = ToolRegistry()

    def reason(self, user_query: str, app_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        The main cognitive loop.
        """
        # 1. Perception
        relevant_history = self.context_manager.retrieve_context(user_query)

        # 2. Deliberation
        thoughts = [
            f"Observing state: User is on {app_state.get('currentView')}.",
            f"Analyzing Intent: '{user_query}'"
        ]

        if relevant_history:
            thoughts.append(f"Recall: Found {len(relevant_history)} relevant past interactions.")

        action = None
        response_text = ""

        # --- Rule-Based Routing ---
        lower_q = user_query.lower()

        if "navigate" in lower_q or "go to" in lower_q:
            target = "dashboard"
            if "config" in lower_q: target = "config"
            if "log" in lower_q: target = "logs"
            if "chat" in lower_q: target = "chat"
            if "memory" in lower_q: target = "memory"
            if "train" in lower_q: target = "autotrain"

            thoughts.append(f"Decision: User wants to change view to {target}.")
            action = {
                "tool": "navigationTool",
                "parameters": {"route": target},
                "reasoning": "User explicitly requested navigation."
            }
            response_text = f"Navigating to {target}..."

        elif "train" in lower_q and "start" in lower_q:
            thoughts.append("Decision: Initiating training sequence via tool.")
            action = {
                "tool": "terminalTool",
                "parameters": {"command": "python launcher.py --conf default"},
                "reasoning": "User requested training start."
            }
            response_text = "Launching training subprocess..."

        elif "analyze" in lower_q or "think" in lower_q:
             thoughts.append("Action: Performing deep state analysis.")
             response_text = f"I've analyzed the current configuration for {app_state.get('activeConfig', {}).get('model_name')}. The learning rate seems optimal."

        else:
            thoughts.append("Decision: General chat response.")
            response_text = "I am the AgentEvolver Core. I have read access to your file system and write access to the application state. How can I intervene?"

        # 3. Memory Encoding
        self.context_manager.embed_interaction(user_query, response_text, success=True)

        return {
            "thought_process": thoughts,
            "response_text": response_text,
            "action": action
        }
