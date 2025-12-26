import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Play, Pause } from 'lucide-react';
import { StrainRelationship } from '../types/plant-analysis';

interface StrainNode {
  id: string;
  name: string;
  type: 'sativa' | 'indica' | 'hybrid';
  connections: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export function StrainGraph({ data }: { data: StrainRelationship[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<StrainNode[]>([]);
  const [dragging, setDragging] = useState<StrainNode | null>(null);

  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [paused, setPaused] = useState(false);

  // Initialize Simulation
  useEffect(() => {
    if (!data || data.length === 0) return;

    const cols = Math.ceil(Math.sqrt(data.length));
    const spacingX = 800 / (cols + 1);
    const spacingY = 600 / (cols + 1);

    const strainNodes: StrainNode[] = data.map((d: StrainRelationship, i: number) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      return {
        id: d.id,
        name: d.name,
        type: d.type,
        connections: d.connections || [],
        x: (col + 1) * spacingX + (Math.random() - 0.5) * 50,
        y: (row + 1) * spacingY + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        width: Math.max(d.name.length * 8 + 30, 80),
        height: 36
      };
    });
    setNodes(strainNodes);
  }, [data]);

  // Physics Loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const update = () => {
      // Physics (Skip if paused)
      if (!paused) {
        let activeEnergy = 0;
        nodes.forEach(node => {
          nodes.forEach(other => {
            if (node === other) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = 300;

            if (dist < minDist) {
              const force = 1500 / (dist * dist + 10);
              node.vx += (dx / dist) * force;
              node.vy += (dy / dist) * force;
            }
          });

          const cx = (canvasRef.current?.width || 800) / 2;
          const cy = (canvasRef.current?.height || 600) / 2;
          node.vx += (cx - node.x) * 0.002;
          node.vy += (cy - node.y) * 0.002;

          // Friction
          node.vx *= 0.50;
          node.vy *= 0.50;

          if (node !== dragging) {
            node.x += node.vx;
            node.y += node.vy;
          }

          // Wall bounce
          const padding = node.width / 2;
          const w = canvasRef.current?.width || 800;
          const h = canvasRef.current?.height || 600;
          if (node.x < padding) { node.x = padding; node.vx *= -0.5; }
          if (node.x > w - padding) { node.x = w - padding; node.vx *= -0.5; }
          if (node.y < padding) { node.y = padding; node.vy *= -0.5; }
          if (node.y > h - padding) { node.y = h - padding; node.vy *= -0.5; }

          activeEnergy += Math.abs(node.vx) + Math.abs(node.vy);
        });

        // Auto-sleep
        if (activeEnergy < 0.1 && !dragging) {
          setPaused(true);
        }
      }

      // Draw
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Grid background
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40 * scale;
      const offX = offset.x % gridSize;
      const offY = offset.y % gridSize;
      ctx.beginPath();
      for (let x = offX; x < ctx.canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
      }
      for (let y = offY; y < ctx.canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
      }
      ctx.stroke();

      // Apply transform
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // Draw links (strain lineage connections)
      ctx.lineWidth = 2.5 / scale;
      nodes.forEach((node, i) => {
        node.connections.forEach(connId => {
          const other = nodes.find(n => n.id === connId);
          if (!other) return;

          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 500) {
            const alpha = Math.max(0, (1 - dist / 500) * 0.6);
            ctx.strokeStyle = node.type === 'sativa'
              ? `rgba(34, 197, 94, ${alpha})` // Green for sativa
              : node.type === 'indica'
              ? `rgba(168, 85, 247, ${alpha})` // Purple for indica
              : `rgba(234, 179, 8, ${alpha})`; // Yellow for hybrid

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.bezierCurveTo(
              node.x, node.y + (other.y - node.y) * 0.5,
              other.x, other.y - (other.y - node.y) * 0.5,
              other.x, other.y
            );
            ctx.stroke();
          }
        });
      });

      // Draw nodes
      nodes.forEach(node => {
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;

        const cardW = node.width;
        const cardH = 40;

        // Card body
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(node.x - cardW / 2, node.y - cardH / 2, cardW, cardH, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Type stripe
        ctx.fillStyle = node.type === 'sativa' ? '#22c55e' : node.type === 'indica' ? '#a855f7' : '#eab308';
        ctx.beginPath();
        ctx.roundRect(node.x - cardW / 2, node.y - cardH / 2, 6, cardH, [8, 0, 0, 8]);
        ctx.fill();

        // Border
        ctx.strokeStyle = node === dragging ? '#22c55e' : '#1e293b';
        ctx.lineWidth = node === dragging ? 2 / scale : 1 / scale;
        ctx.beginPath();
        ctx.roundRect(node.x - cardW / 2, node.y - cardH / 2, cardW, cardH, 8);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#f8fafc';
        ctx.font = `600 ${10}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textX = node.x - cardW / 2 + 12;
        ctx.fillText(
          node.name.length > 20 ? node.name.substring(0, 18) + '..' : node.name,
          textX,
          node.y
        );

        // Port dot
        ctx.fillStyle = node.type === 'sativa' ? '#22c55e' : node.type === 'indica' ? '#a855f7' : '#eab308';
        ctx.beginPath();
        ctx.arc(node.x + cardW / 2 - 8, node.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, dragging, paused, scale, offset]);

  // Mouse handling with transform
  const getTransformedPoint = (e: any) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, sx: 0, sy: 0 };

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wx = (sx - offset.x) / scale;
    const wy = (sy - offset.y) / scale;
    return { x: wx, y: wy, sx, sy };
  };

  const handleMouseDown = (e: any) => {
    const { x, y, sx, sy } = getTransformedPoint(e);

    const hit = nodes.find(n =>
      x > n.x - n.width / 2 && x < n.x + n.width / 2 &&
      y > n.y - n.height / 2 && y < n.y + n.height / 2
    );

    if (hit) {
      setDragging(hit);
    } else {
      setIsPanning(true);
      setPanStart({ x: sx - offset.x, y: sy - offset.y });
    }
  };

  const handleMouseMove = (e: any) => {
    const { x, y, sx, sy } = getTransformedPoint(e);

    if (dragging) {
      dragging.x = x;
      dragging.y = y;
      if (paused) setPaused(false);
    } else if (isPanning) {
      setOffset({ x: sx - panStart.x, y: sy - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, scale + delta), 3);
    setScale(newScale);
  };

  return (
    <div className="relative w-full h-[500px] bg-slate-950/80 rounded-xl border border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden group">
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} active:cursor-grabbing`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Controls toolbar */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 flex items-center gap-1 shadow-xl backdrop-blur-md opacity-50 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setPaused(!paused)}
            className="p-1.5 hover:bg-slate-700 rounded text-green-400 hover:text-green-300 transition-colors"
            title={paused ? "Resume Physics" : "Pause Physics"}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1"></div>
          <button
            onClick={() => setScale(s => Math.min(3, s + 0.2))}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.2, s - 0.2))}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            title="Reset View"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-slate-900/50 border border-slate-800 rounded px-3 py-2 text-xs space-y-1 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-slate-300">Sativa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500"></div>
            <span className="text-slate-300">Indica</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-slate-300">Hybrid</span>
          </div>
        </div>
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-slate-900/50 border border-slate-800 rounded px-2 py-1 text-[9px] font-bold text-green-500 uppercase tracking-widest backdrop-blur-sm">
          {data.length} Strains
        </div>
      </div>
    </div>
  );
}
