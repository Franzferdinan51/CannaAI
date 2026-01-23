
import aiohttp
import logging
import json
from typing import Dict, Any

logger = logging.getLogger("WebhookService")

class WebhookService:
    def __init__(self):
        self.session = None

    async def _get_session(self):
        if self.session is None:
            self.session = aiohttp.ClientSession()
        return self.session

    async def send_event(self, url: str, secret: str, event_type: str, payload: Dict[str, Any]):
        """
        Sends an asynchronous POST request to the external application.
        """
        if not url:
            return

        session = await self._get_session()

        headers = {
            "Content-Type": "application/json",
            "X-Agent-Signature": secret or "",
            "X-Event-Type": event_type
        }

        body = {
            "event": event_type,
            "timestamp": payload.get("timestamp"),
            "data": payload
        }

        try:
            async with session.post(url, json=body, headers=headers, timeout=5) as resp:
                if resp.status >= 400:
                    logger.warning(f"Webhook failed {resp.status}: {await resp.text()}")
                else:
                    logger.debug(f"Webhook sent to {url}: {event_type}")
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")

    async def close(self):
        if self.session:
            await self.session.close()
