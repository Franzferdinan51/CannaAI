#!/usr/bin/env python3
"""
AgentEvolver Launcher for CannaAI Integration
==============================================

This launcher initializes the AgentEvolver framework with proper configuration
for CannaAI's cannabis cultivation management system. It handles:
- Self-questioning task generation
- Self-navigating exploration
- Self-attributing learning
- Performance tracking
- Prompt optimization

Usage:
    python launcher.py [--config path/to/config.yaml] [--port PORT]
"""

import os
import sys
import argparse
import logging
import asyncio
import json
from pathlib import Path
from typing import Dict, Any, Optional

# Try to import AgentEvolver framework
try:
    from agentevolver import AgentEvolver, Config, initialize_framework
except ImportError:
    AGENTEVOLVER_AVAILABLE = False
    logging.warning("AgentEvolver framework not found. Using mock implementation.")
else:
    AGENTEVOLVER_AVAILABLE = True

# Import the existing server as fallback
from server import app as fastapi_app, evolver

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AgentEvolverLauncher:
    """Launcher for AgentEvolver with CannaAI integration"""

    def __init__(self, config_path: Optional[str] = None, port: int = 8001):
        self.config_path = config_path or "config.yaml"
        self.port = port
        self.config = self._load_config()
        self.evolver = None

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from YAML file or use defaults"""
        default_config = {
            "version": "1.0.0",
            "environment": "cannaai",
            "server": {
                "host": "0.0.0.0",
                "port": self.port,
                "reload": False
            },
            "agentevolver": {
                "enabled": True,
                "mode": "service",
                "evolution_level": "advanced",
                "learning_rate": 0.1,
                "performance_threshold": 0.8,
                "auto_optimization": True,
                "self_questioning": True,
                "self_navigation": True,
                "self_attribution": True
            },
            "cannaai": {
                "integration": {
                    "enabled": True,
                    "cors_origins": [
                        "http://localhost:3000",
                        "http://127.0.0.1:3000"
                    ],
                    "api_prefix": "/api/agentevolver"
                },
                "features": {
                    "prompt_optimization": True,
                    "performance_tracking": True,
                    "continuous_learning": True,
                    "cannabis_expertise": True,
                    "strain_specific_analysis": True,
                    "symptom_pattern_recognition": True
                }
            },
            "dataflow": {
                "service_oriented": True,
                "real_time_processing": True,
                "event_driven": True,
                "state_management": "persistent",
                "learning_feedback_loop": True
            },
            "logging": {
                "level": "INFO",
                "file": "logs/agentevolver.log",
                "max_size": "10MB",
                "backup_count": 5
            }
        }

        if os.path.exists(self.config_path):
            try:
                import yaml
                with open(self.config_path, 'r') as f:
                    loaded_config = yaml.safe_load(f) or {}
                logger.info(f"Configuration loaded from {self.config_path}")
                # Merge with defaults
                default_config.update(loaded_config)
            except Exception as e:
                logger.warning(f"Failed to load config from {self.config_path}: {e}")
                logger.info("Using default configuration")
        else:
            logger.info(f"Config file not found at {self.config_path}, using defaults")

        return default_config

    def initialize_framework(self) -> bool:
        """Initialize the AgentEvolver framework"""
        logger.info("Initializing AgentEvolver framework...")

        if not AGENTEVOLVER_AVAILABLE:
            logger.warning("AgentEvolver framework not available, using mock server")
            return False

        try:
            # Initialize with CannaAI configuration
            config = Config(
                environment=self.config["environment"],
                mode=self.config["agentevolver"]["mode"],
                evolution_level=self.config["agentevolver"]["evolution_level"],
                learning_rate=self.config["agentevolver"]["learning_rate"],
                performance_threshold=self.config["agentevolver"]["performance_threshold"]
            )

            self.evolver = initialize_framework(config)
            logger.info("AgentEvolver framework initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize AgentEvolver framework: {e}")
            logger.info("Falling back to mock implementation")
            return False

    def start_server(self):
        """Start the AgentEvolver server"""
        logger.info("=" * 60)
        logger.info("🤖 AgentEvolver Launcher Starting")
        logger.info("=" * 60)
        logger.info(f"Environment: {self.config['environment']}")
        logger.info(f"Mode: {self.config['agentevolver']['mode']}")
        logger.info(f"Port: {self.config['server']['port']}")
        logger.info(f"Integration: {self.config['cannaai']['integration']['enabled']}")
        logger.info("=" * 60)

        # Display capabilities
        logger.info("📋 AgentEvolver Capabilities:")
        if self.config['agentevolver']['self_questioning']:
            logger.info("  ✓ Self-questioning task generation")
        if self.config['agentevolver']['self_navigation']:
            logger.info("  ✓ Self-navigating exploration")
        if self.config['agentevolver']['self_attribution']:
            logger.info("  ✓ Self-attributing learning")
        if self.config['cannaai']['features']['cannabis_expertise']:
            logger.info("  ✓ Cannabis cultivation expertise")
        if self.config['cannaai']['features']['strain_specific_analysis']:
            logger.info("  ✓ Strain-specific analysis")
        if self.config['cannaai']['features']['prompt_optimization']:
            logger.info("  ✓ Prompt optimization")
        if self.config['cannaai']['features']['continuous_learning']:
            logger.info("  ✓ Continuous learning & adaptation")
        logger.info("=" * 60)

        # Ensure log directory exists
        log_file = self.config.get('logging', {}).get('file', 'logs/agentevolver.log')
        log_dir = os.path.dirname(log_file)
        if log_dir:
            Path(log_dir).mkdir(parents=True, exist_ok=True)

        # Configure FastAPI with merged configuration
        import uvicorn
        from server import app

        # Update CORS settings if specified
        cors_origins = self.config['cannaai']['integration']['cors_origins']
        logger.info(f"Allowing CORS origins: {', '.join(cors_origins)}")

        # Start the server
        logger.info(f"Starting server on {self.config['server']['host']}:{self.config['server']['port']}")
        logger.info(f"API available at: http://localhost:{self.config['server']['port']}/")
        logger.info(f"Health check: http://localhost:{self.config['server']['port']}/health")
        logger.info(f"API prefix: {self.config['cannaai']['integration']['api_prefix']}")
        logger.info("=" * 60)
        logger.info("🚀 AgentEvolver is ready!")
        logger.info("=" * 60)

        try:
            uvicorn.run(
                "server:app",
                host=self.config['server']['host'],
                port=self.config['server']['port'],
                reload=self.config['server']['reload'],
                log_level=self.config.get('logging', {}).get('level', 'info').lower()
            )
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
        except Exception as e:
            logger.error(f"Server error: {e}")
            raise

    def get_status(self) -> Dict[str, Any]:
        """Get launcher status"""
        return {
            "launcher_version": "1.0.0",
            "config_path": self.config_path,
            "port": self.port,
            "framework_available": AGENTEVOLVER_AVAILABLE,
            "initialized": self.evolver is not None,
            "config": self.config
        }


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="AgentEvolver Launcher for CannaAI Integration"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Path to configuration file (default: config.yaml)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8001,
        help="Server port (default: 8001)"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Display launcher status and exit"
    )

    args = parser.parse_args()

    # Create launcher instance
    launcher = AgentEvolverLauncher(config_path=args.config, port=args.port)

    if args.status:
        status = launcher.get_status()
        print(json.dumps(status, indent=2))
        sys.exit(0)

    # Initialize framework
    launcher.initialize_framework()

    # Start server
    launcher.start_server()


if __name__ == "__main__":
    main()
