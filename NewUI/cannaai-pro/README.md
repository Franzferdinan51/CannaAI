# CannaAI active frontend

This directory contains the maintained CannaAI React/Vite frontend. It connects to the root Next.js API server and is the application launched by the root `dev`, `build`, and `start` commands.

## Development

From the repository root:

```bash
npm install
cd NewUI/cannaai-pro
npm install
npm run dev
```

Run the backend separately with `npm run dev:backend` from the repository root. The Vite development server uses port `5174`; the backend uses port `3000` by default. Set `PORT` (and, when needed, `CANNAAI_BACKEND_URL`) for another backend port.

## Quality gates

```bash
npm run typecheck
npm run build
npm run preview
```

The active typecheck follows the application entry point through `src/App.tsx`; historical components not imported by the active app remain preserved under version control but are not part of this gate.

## Configuration

Set `VITE_API_URL` when the frontend should call a backend at a different origin. For a same-machine custom backend port, `CANNAAI_BACKEND_URL` configures the Vite proxy target. See the repository [environment example](../../.env.example) for backend/provider configuration. Local AI inference is configured in the CannaAI Settings screen and is health-checked through the backend.

## Active areas

- Dashboard and plant overview
- Photo scanner and vision analysis
- Local-AI chat and provider settings
- Sensors and real-time Socket.IO updates
- Reports, automation, and cultivation tools

For backend, provider, agent, and deployment documentation, start with the repository [documentation index](../../docs/README.md).
