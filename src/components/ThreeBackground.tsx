/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - React Three Fiber intrinsic elements require special JSX type augmentation
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Float,
  MeshDistortMaterial,
  Sphere,
  Box,
  Octahedron,
  Dodecahedron,
  Icosahedron,
  Tetrahedron,
  Environment,
  PerspectiveCamera
} from '@react-three/drei';
import { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import * as THREE from 'three';

// Seeded random for deterministic results
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Individual 3D object components
function FloatingGeometry({
  position,
  geometry,
  color,
  speed = 1,
  intensity = 1,
  seed = 0
}: {
  position: [number, number, number];
  geometry: string;
  color: string;
  speed?: number;
  intensity?: number;
  seed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Use seeded random for stable scale
  const scale = useMemo(() => 0.5 + seededRandom(seed) * 0.5, [seed]);
  const showWireframe = useMemo(() => seededRandom(seed + 100) > 0.7, [seed]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01 * speed;
      meshRef.current.rotation.y += 0.015 * speed;
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * speed) * 0.002 * intensity;
    }
  });

  const renderGeometry = () => {
    const props = {
      ref: meshRef,
      position,
      scale,
    };

    switch (geometry) {
      case 'sphere':
        return (
          <Sphere {...props}>
            <MeshDistortMaterial
              color={color}
              attach="material"
              distort={0.4}
              speed={2}
              roughness={0.1}
              metalness={0.8}
            />
          </Sphere>
        );
      
      case 'cube':
        return (
          <Box {...props}>
            <meshPhysicalMaterial
              color={color}
              roughness={0.2}
              metalness={0.9}
              reflectivity={0.8}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </Box>
        );
      
      case 'octahedron':
        return (
          <Octahedron {...props}>
            <meshStandardMaterial
              color={color}
              roughness={0.3}
              metalness={0.7}
              emissive={color}
              emissiveIntensity={0.1}
            />
          </Octahedron>
        );
      
      case 'dodecahedron':
        return (
          <Dodecahedron {...props}>
            <meshPhysicalMaterial
              color={color}
              roughness={0.1}
              metalness={0.9}
              transmission={0.3}
              thickness={0.5}
            />
          </Dodecahedron>
        );
      
      case 'icosahedron':
        return (
          <Icosahedron {...props}>
            <meshStandardMaterial
              color={color}
              roughness={0.4}
              metalness={0.6}
              wireframe={showWireframe}
            />
          </Icosahedron>
        );
      
      case 'tetrahedron':
        return (
          <Tetrahedron {...props}>
            <meshPhysicalMaterial
              color={color}
              roughness={0.2}
              metalness={0.8}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
            />
          </Tetrahedron>
        );
      
      default:
        return (
          <Sphere {...props}>
            <meshStandardMaterial color={color} />
          </Sphere>
        );
    }
  };

  return (
    <Float speed={speed} rotationIntensity={intensity} floatIntensity={intensity * 0.5}>
      {renderGeometry()}
    </Float>
  );
}

// Dynamic lighting component
function DynamicLighting({ scrollProgress }: { scrollProgress: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 10;
      lightRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.5) * 10;
      lightRef.current.intensity = 0.5 + Math.sin(state.clock.elapsedTime) * 0.3;
    }
  });

  // Color transitions based on scroll progress
  const getLightColor = (progress: number) => {
    if (progress < 0.2) return '#FCD34D'; // Yellow
    if (progress < 0.4) return '#EC4899'; // Pink
    if (progress < 0.6) return '#8B5CF6'; // Purple
    if (progress < 0.8) return '#06B6D4'; // Cyan
    return '#10B981'; // Green
  };

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight 
        ref={lightRef}
        color={getLightColor(scrollProgress)}
        intensity={0.8}
        position={[0, 0, 5]}
        distance={20}
      />
      <pointLight
        color="#ffffff"
        intensity={0.3}
        position={[-10, -10, -5]}
      />
      <spotLight
        color={getLightColor(scrollProgress)}
        intensity={0.5}
        position={[10, 10, 10]}
        angle={0.3}
        penumbra={1}
        castShadow
      />
    </>
  );
}

// Particle system component
function ParticleField({ count = 50, scrollProgress }: { count?: number; scrollProgress: number }) {
  const { viewport } = useThree();
  const particlesRef = useRef<THREE.Points>(null);

  // Generate stable particle positions using useMemo with seeded random
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const baseColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Use seeded random for stable positions
      positions[i * 3] = (seededRandom(i * 3) - 0.5) * viewport.width * 2;
      positions[i * 3 + 1] = (seededRandom(i * 3 + 1) - 0.5) * viewport.height * 2;
      positions[i * 3 + 2] = (seededRandom(i * 3 + 2) - 0.5) * 20;

      // Initialize base colors
      baseColors[i * 3] = 1;
      baseColors[i * 3 + 1] = 0.8;
      baseColors[i * 3 + 2] = 0.3;
    }

    return { positions, baseColors };
  }, [count, viewport.width, viewport.height]);

  // Update colors based on scroll progress
  const colors = useMemo(() => {
    const updatedColors = new Float32Array(count * 3);
    const colorIndex = Math.floor(scrollProgress * 4);
    const gradientColors = [
      [1, 0.8, 0.3], // Yellow
      [0.9, 0.3, 0.6], // Pink
      [0.5, 0.4, 1], // Purple
      [0.1, 0.7, 0.8], // Cyan
      [0.1, 0.7, 0.5], // Green
    ];

    const currentColor = gradientColors[colorIndex] || gradientColors[0];
    for (let i = 0; i < count; i++) {
      updatedColors[i * 3] = currentColor[0];
      updatedColors[i * 3 + 1] = currentColor[1];
      updatedColors[i * 3 + 2] = currentColor[2];
    }

    return updatedColors;
  }, [count, scrollProgress]);

  useFrame(() => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.001;
      particlesRef.current.rotation.x += 0.0005;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleData.positions.length / 3}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Main scene component
function Scene({ scrollProgress }: { scrollProgress: number }) {
  const { viewport: _viewport } = useThree();
  
  // Generate positions for 3D objects using seeded random for stability
  const [objects] = useState(() => {
    const positions: Array<{
      position: [number, number, number];
      geometry: string;
      color: string;
      speed: number;
      intensity: number;
    }> = [];

    const geometries = ['sphere', 'cube', 'octahedron', 'dodecahedron', 'icosahedron', 'tetrahedron'];
    const gradientColors = ['#FCD34D', '#EC4899', '#8B5CF6', '#06B6D4', '#10B981'];

    for (let i = 0; i < 12; i++) {
      positions.push({
        position: [
          (seededRandom(i * 10) - 0.5) * 20 * 1.5,
          (seededRandom(i * 10 + 1) - 0.5) * 15 * 1.5,
          (seededRandom(i * 10 + 2) - 0.5) * 15
        ] as [number, number, number],
        geometry: geometries[Math.floor(seededRandom(i * 10 + 3) * geometries.length)],
        color: gradientColors[Math.floor(seededRandom(i * 10 + 4) * gradientColors.length)],
        speed: 0.5 + seededRandom(i * 10 + 5) * 1.5,
        intensity: 0.5 + seededRandom(i * 10 + 6) * 1
      });
    }

    return positions;
  });
  
  return (
    <>
      <DynamicLighting scrollProgress={scrollProgress} />
      <ParticleField count={100} scrollProgress={scrollProgress} />
      
      {objects.map((obj, index) => (
        <FloatingGeometry
          key={index}
          position={obj.position}
          geometry={obj.geometry}
          color={obj.color}
          speed={obj.speed}
          intensity={obj.intensity}
          seed={index}
        />
      ))}
      
      {/* Environment for reflections */}
      <Environment preset="night" />
    </>
  );
}

// Main component
export function ThreeBackground() {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrolled / maxScroll, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      <Canvas
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: false, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 10]} />
          <Scene scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>
    </div>
  );
}