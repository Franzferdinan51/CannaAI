# CannaAI (CultivAI Pro) Context

## Project Overview
CannaAI (aka CultivAI Pro) is a comprehensive, AI-powered cannabis cultivation management system. It combines real-time IoT sensor monitoring, advanced computer vision for plant health analysis, and business management tools (inventory, harvest, costs).

The system features a unique **AgentEvolver** component—a self-improving AI system that optimizes prompts based on feedback and context. It supports 7 different AI providers (LM Studio, Gemini, Claude, etc.) with an intelligent fallback mechanism.

## Technology Stack

### Core
*   **Framework:** Next.js 15.3.5 (App Router)
*   **Runtime:** Node.js 18+ (Custom Server via `server.ts`)
*   **Language:** TypeScript 5
*   **Styling:** Tailwind CSS 4, shadcn/ui (Radix Primitives), Framer Motion
*   **Database:** SQLite (via Prisma ORM)
*   **Real-time:** Socket.IO (integrated into custom `server.ts`)

### AI & Agents
*   **AgentEvolver:** Python (FastAPI) service running on port 8001.
*   **Providers:** LM Studio (Local), Google Gemini, Anthropic Claude, Groq, OpenRouter, OpenAI-compatible.
*   **Integration:** Z-AI Web Dev SDK, custom fallback logic in `src/lib/ai/`.

### Tools
*   **ORM:** Prisma (`prisma/schema.prisma`)
*   **State:** Zustand (Client), TanStack Query (Server state)
*   **Testing:** Jest (`npm test`)
*   **Linting:** ESLint (`npm run lint`)

## Architecture

### Directory Structure
*   `src/app`: Next.js App Router pages and API routes.
*   `src/components`: Reusable UI components (shadcn/ui in `src/components/ui`).
*   `src/lib`: Shared utilities, database connection (`db.ts`), AI logic (`ai.ts`), and socket client (`socket-client.ts`).
*   `server.ts`: Custom Node.js server entry point. Handles Next.js request handling AND Socket.IO WebSocket server.
*   `prisma`: Database schema and SQLite file (`prisma/db/custom.db`).
*   `agentevolver`: Python backend for the self-evolving AI prompt system.

### Key Workflows
1.  **AI Analysis:** Users upload plant images -> Frontend sends to `/api/analyze` -> API orchestrates AI providers -> Results stored in DB.
2.  **Real-time Monitoring:** Sensors send data -> Socket.IO server receives -> Broadcasts to frontend clients -> Triggers automation rules.
3.  **AgentEvolver:** Next.js backend calls Python service (`http://localhost:8001`) to optimize prompts before sending them to AI providers.

## Development & Commands

### Startup
*   **Windows:** Use `startup.bat` (Select Mode 1 for Dev, Mode 2 for Dev + AgentEvolver).
*   **Standard:** `npm run dev` (Unix) or `npm run dev:win` (Windows).
*   **Python Agent:** `python agentevolver/server.py` (Port 8001).

### Database
*   `npm run db:generate`: Generate Prisma client.
*   `npm run db:push`: Push schema changes to SQLite.
*   `npm run db:reset`: Reset database.

### Build & Test
*   `npm run build`: Production build (Server mode).
*   `npm run build:static`: Static export (Netlify compatible).
*   `npm test`: Run Jest unit tests.
*   `npm run lint`: Run ESLint.

## Configuration
*   **Environment:** `.env.local` contains API keys (Gemini, Claude, etc.), DB URL, and feature flags.
*   **Next Config:** `next.config.ts` handles build settings.
*   **Tailwind:** `tailwind.config.ts` (v4 configuration).

## Conventions
*   **Components:** PascalCase, functional components.
*   **Imports:** Use `@/` alias for `src/` (e.g., `import { db } from "@/lib/db"`).
*   **Styling:** Utility-first with Tailwind.
*   **Strictness:** Flexible TypeScript strictness (allow `any` where necessary for rapid prototyping).

## Critical Files
*   `README.md`: Primary documentation.
*   `AGENTS.md`: Developer/Agent guidelines.
*   `server.ts`: Custom server logic.
*   `src/lib/ai.ts`: AI provider integration logic.
*   `prisma/schema.prisma`: Data models.
