import React, { useRef, useEffect, useState } from 'react';

export const HomepageBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [, setInitialized] = useState(false);

  interface Node {
    x: number;
    y: number;
    radius: number;
    color: string;
    speed: number;
    angle: number;
    pulse: number;
  }

  interface Connection {
    startIndex: number;
    endIndex: number;
    active: boolean;
    particles: { position: number; speed: number; size: number; }[];
  }

  interface CoreNode {
    x: number;
    y: number;
    radius: number;
    pulseRadius: number;
    rotation: number;
    heartbeat: {
      active: boolean;
      scale: number;
      baseScale: number;
      speed: number;
      strength: number;
      nextBeatTime: number;
    };
  }

  interface Point {
    x: number;
    y: number;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let connections: Connection[] = [];
    let coreNode: CoreNode | null = null;
    let isDark = document.documentElement.classList.contains('dark');

    const colors = {
      light: {
        background: 'rgba(255, 255, 255, 0.95)', 
        node: ['#3b82f6', '#8b5cf6', '#0ea5e9', '#14b8a6'],
        core: '#3b82f6',
        connection: 'rgba(59, 130, 246, 0.3)' 
      },
      dark: {
        background: 'rgba(1, 2, 8, 0.98)', 
        node: ['#60a5fa', '#a78bfa', '#38bdf8', '#2dd4bf'],
        core: '#60a5fa',
        connection: 'rgba(96, 165, 250, 0.3)' 
      }
    };

    const getThemeColors = () => isDark ? colors.dark : colors.light;

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      coreNode = {
        x: width / 2,
        y: height / 2,
        radius: Math.min(width, height) * 0.09,
        pulseRadius: 0,
        rotation: 0,
        heartbeat: {
          active: true,
          scale: 1.0,
          baseScale: 1.0,
          speed: 0.02,
          strength: 0.08,
          nextBeatTime: Date.now() + 2000 + Math.random() * 1000
        }
      };

      nodes = [];
      const nodeCount = 20; 
      const colorSet = getThemeColors().node;

      for (let i = 0; i < nodeCount; i++) {

        const isInnerLayer = i % 2 === 0;
        const angle = (i / (nodeCount/2)) * Math.PI * 2; 
        const distance = Math.min(width, height) * (isInnerLayer ? 0.18 : 0.32); 

        nodes.push({
          x: width / 2 + Math.cos(angle) * distance,
          y: height / 2 + Math.sin(angle) * distance,
          radius: 6 + Math.random() * 5, 
          color: colorSet[i % colorSet.length],
          speed: 0.0005 + Math.random() * 0.0008, 
          angle: Math.random() * Math.PI * 2,
          pulse: Math.random() < 0.3 ? 1 : 0
        });
      }

      connections = [];
      const connectionCount = nodeCount * 2;

      for (let i = 0; i < nodeCount; i++) {
        let targetIndex;
        do {
          targetIndex = Math.floor(Math.random() * nodeCount);
        } while (targetIndex === i);

        connections.push({
          startIndex: i,
          endIndex: targetIndex,
          active: true,
          particles: Array(1 + Math.floor(Math.random() * 3)).fill(0).map(() => ({
            position: Math.random(),
            speed: 0.002 + Math.random() * 0.003,
            size: 3 + Math.random() * 3
          }))
        });
      }

      for (let i = 0; i < connectionCount - nodeCount; i++) {
        const startIndex = Math.floor(Math.random() * nodeCount);
        let endIndex;

        do {
          endIndex = Math.floor(Math.random() * nodeCount);
        } while (endIndex === startIndex);

        connections.push({
          startIndex,
          endIndex,
          active: Math.random() > 0.3,
          particles: Array(1 + Math.floor(Math.random() * 2)).fill(0).map(() => ({
            position: Math.random(),
            speed: 0.002 + Math.random() * 0.002,
            size: 3 + Math.random() * 3
          }))
        });
      }

      if (coreNode) {

        const nodesToConnect = Math.floor(nodeCount / 2);
        const nodesToConnectIndices = Array.from({length: nodeCount}, (_, i) => i)
          .sort(() => Math.random() - 0.5)
          .slice(0, nodesToConnect);

        nodesToConnectIndices.forEach(nodeIndex => {
          nodes[nodeIndex].pulse = 1;

          connections.push({
            startIndex: -1,
            endIndex: nodeIndex,
            active: true,
            particles: Array(2 + Math.floor(Math.random() * 2)).fill(0).map(() => ({
              position: Math.random() * 0.5,
              speed: 0.003 + Math.random() * 0.002,
              size: 4 + Math.random() * 3
            }))
          });
        });
      }

      setInitialized(true);
    };

    const render = () => {
      if (!ctx || !coreNode) return;

      const newDarkMode = document.documentElement.classList.contains('dark');
      if (isDark !== newDarkMode) {
        isDark = newDarkMode;
      }

      const themeColors = getThemeColors();

      ctx.fillStyle = themeColors.background;
      ctx.fillRect(0, 0, width, height);

      connections.forEach(connection => {
        let start: Point, end: Point;

        if (connection.startIndex === -1 && coreNode) {

          start = { x: coreNode.x, y: coreNode.y };
          end = { x: nodes[connection.endIndex].x, y: nodes[connection.endIndex].y };

          const dx = end.x - start.x;
          const dy = end.y - start.y;
          void Math.sqrt(dx * dx + dy * dy);

          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const cpX = midX - dy * 0.15; 
          const cpY = midY + dx * 0.15;

          ctx.strokeStyle = themeColors.connection;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.quadraticCurveTo(cpX, cpY, end.x, end.y);
          ctx.stroke();

          connection.particles.forEach(particle => {
            particle.position += particle.speed * 0.8; 
            if (particle.position > 1) particle.position = 0;

            const t = particle.position;
            const u = 1 - t;
            const x = u*u*start.x + 2*u*t*cpX + t*t*end.x;
            const y = u*u*start.y + 2*u*t*cpY + t*t*end.y;

            const glowSize = particle.size * 2.5; 
            ctx.globalAlpha = 0.3; 
            ctx.fillStyle = themeColors.core;
            ctx.beginPath();
            ctx.arc(x, y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.6; 
            ctx.beginPath();
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {

          start = { x: nodes[connection.startIndex].x, y: nodes[connection.startIndex].y };
          end = { x: nodes[connection.endIndex].x, y: nodes[connection.endIndex].y };

          ctx.strokeStyle = themeColors.connection;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();

          connection.particles.forEach(particle => {
            particle.position += particle.speed;
            if (particle.position > 1) {
              particle.position = 0;

              if (connection.endIndex >= 0) {
                nodes[connection.endIndex].pulse = 1;
              }
            }

            const x = start.x + (end.x - start.x) * particle.position;
            const y = start.y + (end.y - start.y) * particle.position;

            const glowSize = particle.size * 1.8;
            ctx.globalAlpha = 0.3;
            const gradient = ctx.createRadialGradient(
              x, y, 0,
              x, y, glowSize
            );
            gradient.addColorStop(0, themeColors.connection);
            gradient.addColorStop(1, 'rgba(96, 165, 250, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.8;
            ctx.fillStyle = themeColors.connection;
            ctx.beginPath();
            ctx.arc(x, y, particle.size, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });

      if (coreNode.heartbeat.active) {
        const now = Date.now();

        if (now >= coreNode.heartbeat.nextBeatTime) {

          coreNode.heartbeat.scale = 1.0 + coreNode.heartbeat.strength;

          const baseInterval = 2500; 
          const variance = Math.random() * 1000 - 500; 
          coreNode.heartbeat.nextBeatTime = now + baseInterval + variance;

          coreNode.heartbeat.strength = 0.05 + Math.random() * 0.07;
        } else {

          coreNode.heartbeat.scale = Math.max(
            coreNode.heartbeat.baseScale,
            coreNode.heartbeat.scale - coreNode.heartbeat.speed
          );
        }
      }

      ctx.save();
      if (coreNode) {

        const heartbeatScale = coreNode.heartbeat.scale;
        const scaledRadius = coreNode.radius * heartbeatScale;

        const gradient = ctx.createRadialGradient(
          coreNode.x, coreNode.y, 0,
          coreNode.x, coreNode.y, scaledRadius * 1.2
        );
        gradient.addColorStop(0, themeColors.core);
        gradient.addColorStop(0.6, 'rgba(59, 130, 246, 0.4)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(coreNode.x, coreNode.y, scaledRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();

        coreNode.rotation += 0.0008; 
        ctx.translate(coreNode.x, coreNode.y);
        ctx.rotate(coreNode.rotation);

        ctx.strokeStyle = themeColors.core;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, scaledRadius * 1.2, scaledRadius * 1.2, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, scaledRadius * 1.4, scaledRadius * 1.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      nodes.forEach(node => {

        node.angle += node.speed;
        node.x += Math.cos(node.angle) * 0.2;
        node.y += Math.sin(node.angle) * 0.2;

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        if (node.pulse > 0) {
          ctx.strokeStyle = node.color;
          ctx.globalAlpha = node.pulse;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * (2 - node.pulse), 0, Math.PI * 2);
          ctx.stroke();

          node.pulse -= 0.02;
        }

        if (Math.random() < 0.005) {
          node.pulse = 1;
        }
      });

      const maskColor = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)';
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = maskColor;
      ctx.fillRect(0, 0, width, height);

      animationRef.current = requestAnimationFrame(render);
    };

    init();

    const handleResize = () => {
      init();
    };

    const observer = new MutationObserver(() => {
      isDark = document.documentElement.classList.contains('dark');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        transform: 'translateZ(0)',
        opacity: 0.4 
      }}
    />
  );
};

export default HomepageBackground;