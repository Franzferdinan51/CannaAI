
import os
import yaml
import json
import subprocess
import asyncio
import re
import logging
from typing import Dict, Any, AsyncGenerator

logger = logging.getLogger("EvolutionService")

class EvolutionService:
    def __init__(self, workspace_dir: str = "workspace"):
        self.workspace_dir = workspace_dir
        os.makedirs(self.workspace_dir, exist_ok=True)
        self.process = None

    def generate_yaml_config(self, config: Dict[str, Any]) -> str:
        """
        Translates the Dashboard JSON config into AgentEvolver YAML format.
        """
        # Map frontend keys to AgentEvolver keys
        evolver_config = {
            "task": config.get("environment", "AppWorld"),
            "model": {
                "model_name": config.get("model_name", "Qwen-7B"),
                "api_key": config.get("api_key", ""),
                "base_url": config.get("llm_base_url", ""),
            },
            "evolution": {
                "population_size": config.get("population_size", 10),
                "generations": config.get("generations", 5),
                "mutation_rate": config.get("mutation_rate", 0.1),
                "crossover_rate": config.get("crossover_rate", 0.5),
                "strategy": config.get("evolution_strategy", "genetic")
            },
            "training": {
                "batch_size": config.get("batch_size", 32),
                "learning_rate": config.get("learning_rate", 0.0001),
                "epochs": config.get("epochs", 10),
                "output_dir": os.path.join(self.workspace_dir, "outputs")
            }
        }

        yaml_path = os.path.join(self.workspace_dir, "config.yaml")
        with open(yaml_path, 'w') as f:
            yaml.dump(evolver_config, f, default_flow_style=False)

        return yaml_path

    async def run_evolution(self, config: Dict[str, Any]) -> AsyncGenerator[str, None]:
        """
        Runs the AgentEvolver CLI/Script and yields parsed logs.
        """
        yaml_path = self.generate_yaml_config(config)

        # Command to run AgentEvolver.
        # In a real setup, this might be `python -m agent_evolver.start --config ...`
        # Here we construct a command that mimics the library execution
        cmd = ["python", "-u", "-m", "agent_evolver_shim", "--config", yaml_path]

        # Check if the shim exists, if not, use the fallback simulation script
        if not os.path.exists("agent_evolver_shim.py"):
            # If the user hasn't installed the real library, we run a simulation
            # that outputs EXACTLY the format we expect from the real library
            cmd = ["python", "-u", "backend/mock_evolver_cli.py", yaml_path]

        env = os.environ.copy()
        if config.get("api_key"):
            env["OPENAI_API_KEY"] = config["api_key"]

        self.process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=os.getcwd(), # Ensure we run from root
            env=env,
            bufsize=1
        )

        # Regex patterns to parse AgentEvolver logs
        # Example Log: "Generation [1/5]: Avg Reward: 0.45, Best Reward: 0.8"
        metric_pattern = re.compile(r"Generation\s*\[(\d+)/(\d+)\]:.*Avg Reward:\s*([\d\.]+).*Best Reward:\s*([\d\.]+)")

        # Stream output
        while True:
            # Run in executor to prevent blocking the async loop
            line = await asyncio.to_thread(self.process.stdout.readline)
            if not line and self.process.poll() is not None:
                break

            if line:
                decoded_line = line.decode('utf-8').strip()

                # 1. Yield the raw log for the console
                yield f"[STDOUT] {decoded_line}"

                # 2. Parse for metrics
                match = metric_pattern.search(decoded_line)
                if match:
                    gen, total_gen, avg_rew, best_rew = match.groups()
                    # Calculate a 'step' for the chart based on generation
                    step = int(gen) * 10

                    # Yield a special JSON formatted string for the frontend to intercept
                    metric_payload = json.dumps({
                        "step": step,
                        "reward": float(avg_rew),
                        "success_rate": float(best_rew), # Proxying best reward as success for viz
                        "loss": 1.0 - float(avg_rew)
                    })
                    yield f"[METRIC_JSON] {metric_payload}"

        return_code = self.process.poll()
        if return_code == 0:
            yield "[SYSTEM] Evolution process completed successfully."
            yield "[SYSTEM] Best agent saved to workspace/outputs/best_agent.pt"
        else:
            yield f"[ERROR] Evolution process failed with exit code {return_code}"

    def stop(self):
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except:
                self.process.kill()
