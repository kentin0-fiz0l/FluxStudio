'use client';

import { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, Grid } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  Box,
  MessageSquarePlus,
  Maximize2,
} from 'lucide-react';

interface CameraPosition {
  x: number;
  y: number;
  z: number;
  target: { x: number; y: number; z: number };
}

interface ModelAnnotation {
  id: string;
  cameraPosition: CameraPosition;
  content: string;
  author: string;
  isResolved: boolean;
}

interface ModelViewerProps {
  src: string;
  annotations?: ModelAnnotation[];
  onAddAnnotation?: (cameraPosition: CameraPosition) => void;
  onSelectAnnotation?: (annotation: ModelAnnotation) => void;
  className?: string;
}

function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

function CameraController({
  onCameraChange,
}: {
  onCameraChange?: (position: CameraPosition) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (controlsRef.current && onCameraChange) {
      const target = controlsRef.current.target;
      onCameraChange({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        target: { x: target.x, y: target.y, z: target.z },
      });
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={100}
    />
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#666" wireframe />
    </mesh>
  );
}

export function ModelViewer({
  src,
  annotations = [],
  onAddAnnotation,
  onSelectAnnotation,
  className,
}: ModelViewerProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [currentCamera, setCurrentCamera] = useState<CameraPosition | null>(null);

  const handleAddAnnotation = () => {
    if (currentCamera && onAddAnnotation) {
      onAddAnnotation(currentCamera);
    }
  };

  const handleReset = () => {
    // Reset is handled by OrbitControls when re-mounted
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowGrid(!showGrid)}
            className={cn(!showGrid && 'opacity-50')}
          >
            <Box className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddAnnotation}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Add annotation at this view
          </Button>
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 model-viewer-container">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          style={{ background: isDarkMode ? '#1a1a1a' : '#f5f5f5' }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Model src={src} />
          </Suspense>

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />

          {/* Environment */}
          <Environment preset={isDarkMode ? 'night' : 'studio'} />

          {/* Grid */}
          {showGrid && (
            <Grid
              args={[20, 20]}
              cellSize={1}
              cellThickness={0.5}
              cellColor={isDarkMode ? '#333' : '#ccc'}
              sectionSize={5}
              sectionThickness={1}
              sectionColor={isDarkMode ? '#444' : '#999'}
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid
            />
          )}

          {/* Controls */}
          <CameraController onCameraChange={setCurrentCamera} />
        </Canvas>

        {/* Annotation thumbnails */}
        {annotations.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2">
            {annotations.map((annotation, index) => (
              <button
                key={annotation.id}
                className="w-12 h-12 rounded border-2 border-primary bg-background flex items-center justify-center text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => onSelectAnnotation?.(annotation)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
