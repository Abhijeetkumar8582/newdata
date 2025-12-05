import React, { useEffect, useRef } from 'react';
import './WaveformAnimation.css';

/**
 * Waveform Animation Component
 * Displays animated waveforms when bot messages are received
 * Shows small waves when idle, big waves when active
 */
const WaveformAnimation = ({ isActive, isIdle = false }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('⚠️ Canvas not found');
      return;
    }

    // Ensure canvas is sized
    const container = canvas.parentElement;
    if (container) {
      const width = container.offsetWidth || container.clientWidth || 800;
      const height = container.offsetHeight || container.clientHeight || 200;
      canvas.width = width;
      canvas.height = height;
      console.log('📐 Canvas initialized with size:', width, 'x', height);
    }

    const ctx = canvas.getContext('2d', { antialias: true });
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    if (width === 0 || height === 0) {
      console.warn('⚠️ Canvas has zero dimensions');
      return;
    }

    // Enable smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let startTime = Date.now();

      const drawWaveform = () => {
      // Clear canvas - use transparent background
      ctx.clearRect(0, 0, width, height);

      const elapsed = Date.now() - startTime;
      const timeOffset = elapsed * 0.001; // Convert to seconds, slow down animation

      // Draw multiple waveform layers (like the image - concentric waves)
      const layers = 4;
      const frequency = 0.015;
      
      // Use smaller amplitude when idle (0.5x), larger when active
      const baseAmplitude = isIdle ? height * 0.08 : height * 0.15; // Small waves when idle, big when active

      for (let layer = 0; layer < layers; layer++) {
        const layerOpacity = 0.7 - (layer * 0.15); // Outer layers brighter
        const layerAmplitude = baseAmplitude * (1 - layer * 0.25);
        const layerPhase = layer * 0.2;

        // Gold color with varying opacity
        const alpha = isIdle ? layerOpacity * 0.7 : layerOpacity; // Dimmer when idle
        ctx.strokeStyle = `rgba(201, 169, 107, ${Math.max(alpha, 0.3)})`;
        ctx.lineWidth = isIdle ? 2 - (layer * 0.3) : 3 - (layer * 0.5); // Thinner lines when idle
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();

        // Create smoother waveform with higher resolution sampling
        // Sample at 2x resolution for smoother curves
        const sampleRate = 2;
        let previousY = null;

        for (let x = 0; x <= width; x += 1 / sampleRate) {
          const normalizedX = x / width;
          
          // Edge fade - waves flatten at edges (smooth transition)
          const edgeFade = Math.min(
            normalizedX * 3,
            (1 - normalizedX) * 3,
            1
          );
          
          // Center peak - strongest in the middle (less pronounced when idle)
          const centerPeakMultiplier = isIdle ? 0.8 : 1.0;
          const centerPeak = Math.exp(-Math.pow((normalizedX - 0.5) * 5, 2)) * centerPeakMultiplier;
          
          // Waveform with multiple frequencies for smooth complexity
          // Slower animation when idle
          const animationSpeed = isIdle ? 0.5 : 1.0;
          
          // Smoother wave calculations with additional harmonics
          const baseWave = (x * frequency + timeOffset * animationSpeed + layerPhase) * 8;
          const wave1 = Math.sin(baseWave);
          const wave2 = Math.sin(baseWave * 1.5 * 0.7) * 0.3;
          const wave3 = Math.sin(baseWave * 2.1 * 0.5) * 0.15; // Additional harmonic for smoothness
          const wave = wave1 + wave2 + wave3;
          
          // Combine all effects
          const amplitude = layerAmplitude * edgeFade * centerPeak;
          const y = centerY + wave * amplitude;

          if (previousY === null) {
            ctx.moveTo(x, y);
          } else {
            // Use smooth lineTo for continuous curves
            ctx.lineTo(x, y);
          }
          
          previousY = y;
        }

        ctx.stroke();
      }

      // Continuous animation - always continue while active
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    // Start animation
    drawWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isIdle]);

  // Set canvas size - update when active or container changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const updateSize = () => {
        const container = canvas.parentElement;
        if (container) {
          const width = container.offsetWidth || container.clientWidth || 800;
          const height = container.offsetHeight || container.clientHeight || 200;
          canvas.width = width;
          canvas.height = height;
          console.log('📐 Canvas size updated:', width, 'x', height);
        }
      };
      
      // Update size immediately
      updateSize();
      
      // Use ResizeObserver if available for better performance
      if (window.ResizeObserver && canvas.parentElement) {
        const resizeObserver = new ResizeObserver(() => {
          updateSize();
        });
        resizeObserver.observe(canvas.parentElement);
        
        window.addEventListener('resize', updateSize);
        return () => {
          resizeObserver.disconnect();
          window.removeEventListener('resize', updateSize);
        };
      } else {
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
      }
    }
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="waveform-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
};

export default WaveformAnimation;

