import * as React from 'react';
import { templateRegistry } from '@/services/formationTemplates/registry';
import { DrillTemplate, TemplatePosition } from '@/services/formationTemplates/types';

interface TemplatePreviewCanvasProps {
  template: DrillTemplate;
  performerCount: number;
  scale: number;
  rotation: number;
  isAnimating: boolean;
  isMinimal?: boolean;
}

export function TemplatePreviewCanvas({
  template,
  performerCount,
  scale,
  rotation,
  isAnimating,
  isMinimal = false,
}: TemplatePreviewCanvasProps) {
  const [animationFrame, setAnimationFrame] = React.useState(0);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Scale template for actual performer count
  const scaledPositions = React.useMemo((): TemplatePosition[] => {
    return templateRegistry.scaleTemplateForPerformers(template, performerCount);
  }, [template, performerCount]);

  // Animation loop
  React.useEffect(() => {
    if (!isAnimating || template.keyframes.length <= 1) return;

    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % template.keyframes.length);
    }, 1500); // 1.5 seconds per keyframe

    return () => clearInterval(interval);
  }, [isAnimating, template.keyframes.length]);

  // Render canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw grid (only if not minimal)
    if (!isMinimal) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo((width / 4) * i, 0);
        ctx.lineTo((width / 4) * i, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (height / 4) * i);
        ctx.lineTo(width, (height / 4) * i);
        ctx.stroke();
      }
    }

    // Get current positions (interpolate between keyframes if animating)
    let positions: TemplatePosition[] = scaledPositions;

    if (isAnimating && template.keyframes.length > 1) {
      const currentKeyframe = template.keyframes[animationFrame];
      positions = scaledPositions.map((pos: TemplatePosition, index: number) => {
        const keyframePos = currentKeyframe.positions.get(index);
        return keyframePos || pos;
      });
    }

    // Apply transformations and draw performers
    const rotationRad = (rotation * Math.PI) / 180;
    const performerSize = isMinimal ? 6 : 10;
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981',
    ];

    positions.forEach((pos: TemplatePosition, index: number) => {
      // Transform position
      const x = ((pos.x - 50) * scale) / 100 * (width * 0.8);
      const y = ((pos.y - 50) * scale) / 100 * (height * 0.8);

      // Apply rotation around center
      const rotatedX = x * Math.cos(rotationRad) - y * Math.sin(rotationRad);
      const rotatedY = x * Math.sin(rotationRad) + y * Math.cos(rotationRad);

      const finalX = centerX + rotatedX;
      const finalY = centerY + rotatedY;

      // Draw performer dot
      ctx.beginPath();
      ctx.arc(finalX, finalY, performerSize, 0, Math.PI * 2);
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      // Draw label (only if not minimal)
      if (!isMinimal) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(index + 1), finalX, finalY);
      }
    });
  }, [scaledPositions, scale, rotation, animationFrame, isAnimating, isMinimal, template.keyframes]);

  return (
    <canvas
      ref={canvasRef}
      width={isMinimal ? 200 : 400}
      height={isMinimal ? 200 : 400}
      className="w-full h-full"
    />
  );
}
