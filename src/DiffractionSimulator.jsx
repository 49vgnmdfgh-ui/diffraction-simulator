import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Lightbulb, LightbulbOff, Info, Play, Pause, Trash2 } from 'lucide-react';

const DiffractionSimulator = () => {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  
  const [lightOn, setLightOn] = useState(false);
  const [animationActive, setAnimationActive] = useState(true);
  const [wavePhase, setWavePhase] = useState(0);
  const [photonParticles, setPhotonParticles] = useState([]);
  const [accumulatedParticles, setAccumulatedParticles] = useState([]);
  const [showParticles, setShowParticles] = useState(false);
  
  const [params, setParams] = useState({
    wavelength: 550,
    slitWidth: 0.08,
    slitSeparation: 0.4,
    apertureType: 'double',
    numSlits: 3,
    lightIntensity: 1.0,
    screenDistance: 1000,
    diffractionType: 'fraunhofer',
    circularDiameter: 0.15,
    showWaves: true,
    animationSpeed: 1,
    particleEmissionRate: 5
  });
  
  const [prevScreenDistance, setPrevScreenDistance] = useState(1000);
  
  useEffect(() => {
    if (!lightOn || !animationActive) return;
    
    const interval = setInterval(() => {
      setWavePhase(prev => (prev + 0.05 * params.animationSpeed) % (2 * Math.PI));
      
      // Generate photon bubble particles
      setPhotonParticles(prev => {
        let particles = [...prev];
        
        // Add new particles randomly
        if (Math.random() > 0.5) {
          particles.push({
            x: 80,
            y: 300 + (Math.random() - 0.5) * 80,
            vx: 2.5 + Math.random() * 1,
            vy: (Math.random() - 0.5) * 1.5,
            life: 1.0,
            size: 3 + Math.random() * 3
          });
        }
        
        // Update and filter particles
        particles = particles
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life - 0.008
          }))
          .filter(p => p.life > 0 && p.x < 360);
        
        return particles;
      });
    }, 30);
    
    return () => clearInterval(interval);
  }, [lightOn, animationActive, params.animationSpeed]);
  
  // Particle emission for accumulation mode
  useEffect(() => {
    if (!lightOn || !showParticles || !animationActive) return;
    
    const interval = setInterval(() => {
      // Emit particles at the specified rate
      for (let i = 0; i < params.particleEmissionRate; i++) {
        emitPhotonParticle();
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [lightOn, showParticles, animationActive, params]);
  
  const emitPhotonParticle = () => {
    // Determine which slit the photon goes through based on aperture type
    const slitPositions = getSlitPositions();
    if (slitPositions.length === 0) return;
    
    // Randomly select a slit
    const slitY = slitPositions[Math.floor(Math.random() * slitPositions.length)];
    
    // Calculate the screen position based on diffraction probability
    const screenPos = calculatePhotonScreenPosition(slitY);
    
    // Create traveling photon
    const newPhoton = {
      id: Date.now() + Math.random(),
      startX: 350,
      startY: slitY,
      targetX: screenPos.x,
      targetY: screenPos.y,
      progress: 0,
      speed: 0.02 * params.animationSpeed,
      arrived: false
    };
    
    setAccumulatedParticles(prev => [...prev, newPhoton]);
  };
  
  const getSlitPositions = () => {
    const height = 600;
    const slitPixelWidth = params.slitWidth * 300;
    let slitPositions = [];
    
    if (params.apertureType === 'single') {
      slitPositions = [height / 2];
    } else if (params.apertureType === 'double') {
      const separation = params.slitSeparation * 300;
      slitPositions = [height / 2 - separation / 2, height / 2 + separation / 2];
    } else if (params.apertureType === 'multiple') {
      const totalHeight = (params.numSlits - 1) * params.slitSeparation * 300;
      const startY = height / 2 - totalHeight / 2;
      for (let i = 0; i < params.numSlits; i++) {
        slitPositions.push(startY + i * params.slitSeparation * 300);
      }
    } else if (params.apertureType === 'circular') {
      slitPositions = [height / 2];
    }
    
    return slitPositions;
  };
  
  const calculatePhotonScreenPosition = (slitY) => {
    const height = 600;
    const screenHeight = 500;
    const screenRange = 20;
    
    // Use probability distribution based on intensity pattern
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      // Random y position on screen
      const randomY = (Math.random() - 0.5) * screenRange;
      const intensity = calculateIntensity(randomY);
      
      // Accept or reject based on intensity (rejection sampling)
      if (Math.random() < intensity) {
        // Convert to pixel coordinates
        const screenPixelY = height / 2 + (randomY / screenRange) * screenHeight;
        // Add random x position across screen width for natural distribution
        const screenX = 500 + ((params.screenDistance - 500) / (3000 - 500)) * (900 - 500);
        const randomX = screenX + Math.random() * 100;
        return { x: randomX, y: screenPixelY };
      }
      attempts++;
    }
    
    // Fallback to center if no position found
    const screenX = 500 + ((params.screenDistance - 500) / (3000 - 500)) * (900 - 500);
    return { x: screenX + Math.random() * 100, y: height / 2 };
  };
  
  // Update particle positions
  useEffect(() => {
    if (!showParticles || !animationActive) return;
    
    const interval = setInterval(() => {
      setAccumulatedParticles(prev => 
        prev.map(p => {
          if (p.arrived) return p;
          
          const newProgress = Math.min(1, p.progress + p.speed);
          
          if (newProgress >= 1) {
            return { ...p, progress: 1, arrived: true };
          }
          
          return { ...p, progress: newProgress };
        })
      );
    }, 16);
    
    return () => clearInterval(interval);
  }, [showParticles, animationActive]);
  
  // Clear particles when screen distance changes
  useEffect(() => {
    if (params.screenDistance !== prevScreenDistance) {
      setAccumulatedParticles([]);
      setPrevScreenDistance(params.screenDistance);
    }
  }, [params.screenDistance, prevScreenDistance]);
  
  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };
  
  const calculateFresnelNumber = () => {
    const a = params.slitWidth / 1000;
    const L = params.screenDistance / 1000;
    const lambda = params.wavelength * 1e-9;
    return (a * a) / (lambda * L);
  };
  
  const calculateIntensity = (x) => {
    const lambda = params.wavelength * 1e-9;
    const a = params.slitWidth / 1000;
    const d = params.slitSeparation / 1000;
    const L = params.screenDistance / 1000;
    const xPos = x / 1000;
    
    const beta = (Math.PI * a * xPos) / (lambda * L);
    const delta = (Math.PI * d * xPos) / (lambda * L);
    
    let sinc = 1;
    if (Math.abs(beta) > 0.001) {
      sinc = Math.sin(beta) / beta;
    }
    
    if (params.apertureType === 'single') {
      return sinc * sinc;
    } else if (params.apertureType === 'double') {
      const interference = Math.cos(delta);
      return sinc * sinc * interference * interference;
    } else {
      const N = params.numSlits;
      let interference;
      if (Math.abs(Math.sin(delta)) < 0.001) {
        interference = N * N;
      } else {
        interference = Math.sin(N * delta) / Math.sin(delta);
        interference = interference * interference;
      }
      return sinc * sinc * interference / (N * N);
    }
  };
  
  const wavelengthToRGB = (wavelength, intensity = 1) => {
    let r, g, b;
    
    if (wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (wavelength < 490) {
      r = 0;
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength < 510) {
      r = 0;
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
      b = 0;
    } else {
      r = 1;
      g = 0;
      b = 0;
    }
    
    return {
      r: r * intensity * 255,
      g: g * intensity * 255,
      b: b * intensity * 255
    };
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    const lightSourceX = 80;
    const lightSourceY = height / 2;
    const slitX = 350;
    const minScreenX = 500;
    const maxScreenX = 900;
    const screenX = minScreenX + ((params.screenDistance - 500) / (3000 - 500)) * (maxScreenX - minScreenX);
    const screenWidth = 100;
    const screenHeight = 500;
    
    if (lightOn) {
      const gradient = ctx.createRadialGradient(lightSourceX, lightSourceY, 0, lightSourceX, lightSourceY, 50);
      const color = wavelengthToRGB(params.wavelength, 0.8);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.4)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(lightSourceX - 50, lightSourceY - 50, 100, 100);
    }
    
    ctx.strokeStyle = lightOn ? '#ff8800' : '#999';
    ctx.fillStyle = lightOn ? '#ffcc00' : '#ddd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(lightSourceX, lightSourceY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw animated bubble particles from light source to slits
    if (lightOn && animationActive) {
      const photonColor = wavelengthToRGB(params.wavelength, 0.9);
      photonParticles.forEach(p => {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, ${p.life * 0.8})`);
        gradient.addColorStop(0.5, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, ${p.life * 0.4})`);
        gradient.addColorStop(1, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, ${p.life})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    // Draw rays from light source to slits with wavelength color
    if (lightOn && !showParticles) {
      const rayColor = wavelengthToRGB(params.wavelength, 0.5);
      ctx.strokeStyle = `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.6)`;
      ctx.lineWidth = 2.5;
      
      const numSourceRays = 20;
      for (let i = 0; i < numSourceRays; i++) {
        const angle = (i / numSourceRays - 0.5) * Math.PI * 0.6;
        const endY = lightSourceY + Math.tan(angle) * (slitX - lightSourceX);
        
        ctx.beginPath();
        ctx.moveTo(lightSourceX, lightSourceY);
        ctx.lineTo(slitX, endY);
        ctx.stroke();
      }
    }
    
    ctx.fillStyle = '#555';
    ctx.fillRect(slitX - 15, 0, 30, height);
    
    const slitPixelWidth = params.slitWidth * 300;
    ctx.fillStyle = '#fff';
    
    let slitPositions = [];
    
    if (params.apertureType === 'single') {
      const slitY = height / 2 - slitPixelWidth / 2;
      ctx.fillRect(slitX - 15, slitY, 30, slitPixelWidth);
      slitPositions = [height / 2];
    } else if (params.apertureType === 'double') {
      const separation = params.slitSeparation * 300;
      const slit1Y = height / 2 - separation / 2 - slitPixelWidth / 2;
      const slit2Y = height / 2 + separation / 2 - slitPixelWidth / 2;
      
      ctx.fillRect(slitX - 15, slit1Y, 30, slitPixelWidth);
      ctx.fillRect(slitX - 15, slit2Y, 30, slitPixelWidth);
      slitPositions = [height / 2 - separation / 2, height / 2 + separation / 2];
    } else if (params.apertureType === 'multiple') {
      const totalHeight = (params.numSlits - 1) * params.slitSeparation * 300;
      const startY = height / 2 - totalHeight / 2;
      
      for (let i = 0; i < params.numSlits; i++) {
        const slitY = startY + i * params.slitSeparation * 300 - slitPixelWidth / 2;
        ctx.fillRect(slitX - 15, slitY, 30, slitPixelWidth);
        slitPositions.push(startY + i * params.slitSeparation * 300);
      }
    } else if (params.apertureType === 'circular') {
      const radius = params.circularDiameter * 300;
      ctx.beginPath();
      ctx.arc(slitX, height / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      slitPositions = [height / 2];
    }
    
    // Draw wave rays
    if (lightOn && animationActive && !showParticles) {
      slitPositions.forEach(slitY => {
        const numRays = 60;
        for (let i = 0; i < numRays; i++) {
          const angle = (i / (numRays - 1) - 0.5) * Math.PI * 1.2;
          const rayLength = screenX - slitX;
          const endX = slitX + rayLength;
          const endY = slitY + Math.tan(angle) * rayLength;
          
          if (endY > -50 && endY < height + 50) {
            const screenPosY = (endY - height / 2) / screenHeight * 20;
            const intensity = calculateIntensity(screenPosY);
            const distanceFactor = 1 / (1 + rayLength / 200);
            
            const travelPhase = wavePhase * 3;
            const rayProgress = ((travelPhase % (2 * Math.PI)) / (2 * Math.PI));
            
            const gradient = ctx.createLinearGradient(slitX, slitY, endX, endY);
            const rayColor = wavelengthToRGB(params.wavelength, intensity * distanceFactor * 0.8);
            
            const wave1Pos = (rayProgress + 0.0) % 1;
            const wave2Pos = (rayProgress + 0.3) % 1;
            const wave3Pos = (rayProgress + 0.6) % 1;
            
            gradient.addColorStop(0, `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.1)`);
            if (wave3Pos < 1) gradient.addColorStop(wave3Pos, `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.7)`);
            if (wave2Pos < 1) gradient.addColorStop(wave2Pos, `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.5)`);
            if (wave1Pos < 1) gradient.addColorStop(wave1Pos, `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.8)`);
            gradient.addColorStop(1, `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.1)`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2.5;
            
            ctx.beginPath();
            ctx.moveTo(slitX, slitY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
      });
    }
    
    // Draw diffraction rays in particle mode
    if (lightOn && animationActive && showParticles) {
      slitPositions.forEach(slitY => {
        const numRays = 40;
        for (let i = 0; i < numRays; i++) {
          const angle = (i / (numRays - 1) - 0.5) * Math.PI * 1.2;
          const rayLength = screenX - slitX;
          const endX = slitX + rayLength;
          const endY = slitY + Math.tan(angle) * rayLength;
          
          if (endY > -50 && endY < height + 50) {
            const rayColor = wavelengthToRGB(params.wavelength, 0.3);
            
            ctx.strokeStyle = `rgba(${rayColor.r}, ${rayColor.g}, ${rayColor.b}, 0.3)`;
            ctx.lineWidth = 1.5;
            
            ctx.beginPath();
            ctx.moveTo(slitX, slitY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
          }
        }
      });
    }
    
    // Draw traveling and accumulated particles
    if (showParticles) {
      const photonColor = wavelengthToRGB(params.wavelength, 1);
      
      accumulatedParticles.forEach(p => {
        const currentX = p.startX + (p.targetX - p.startX) * p.progress;
        const currentY = p.startY + (p.targetY - p.startY) * p.progress;
        
        // Draw particle
        const particleSize = p.arrived ? 2 : 3;
        const alpha = p.arrived ? 0.8 : 1;
        
        ctx.fillStyle = `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(currentX, currentY, particleSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow for traveling particles
        if (!p.arrived) {
          const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 6);
          gradient.addColorStop(0, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0.6)`);
          gradient.addColorStop(1, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = -5;
    ctx.shadowOffsetY = 5;
    
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(screenX, height / 2 - screenHeight / 2, screenWidth, screenHeight);
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.strokeRect(screenX, height / 2 - screenHeight / 2, screenWidth, screenHeight);
    
    ctx.fillStyle = '#777';
    ctx.fillRect(screenX + screenWidth / 2 - 10, height / 2 + screenHeight / 2, 20, 80);
    ctx.fillRect(screenX + screenWidth / 2 - 40, height / 2 + screenHeight / 2 + 70, 80, 15);
    
    // Draw intensity pattern (only if not in particle mode)
    if (lightOn && !showParticles) {
      const patternStartY = height / 2 - screenHeight / 2;
      const patternHeight = screenHeight;
      const screenRange = 20;
      
      const intensities = [];
      let maxIntensity = 0;
      
      for (let i = 0; i < patternHeight; i++) {
        const y = (i / patternHeight - 0.5) * screenRange;
        const intensity = calculateIntensity(y);
        intensities.push(intensity);
        maxIntensity = Math.max(maxIntensity, intensity);
      }
      
      for (let i = 0; i < patternHeight; i++) {
        const normalizedIntensity = intensities[i] / maxIntensity;
        const color = wavelengthToRGB(params.wavelength, normalizedIntensity * params.lightIntensity);
        
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.fillRect(screenX, patternStartY + i, screenWidth, 1);
      }
    }
    
    // Draw accumulated particles on screen as individual dots that build up to form lines
    if (showParticles && lightOn) {
      const photonColor = wavelengthToRGB(params.wavelength, 1);
      const arrivedParticles = accumulatedParticles.filter(p => p.arrived);
      
      arrivedParticles.forEach(p => {
        // Draw each particle as a small circular dot with slight glow
        const gradient = ctx.createRadialGradient(p.targetX, p.targetY, 0, p.targetX, p.targetY, 3);
        gradient.addColorStop(0, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0.9)`);
        gradient.addColorStop(0.5, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0.5)`);
        gradient.addColorStop(1, `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 0.1)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.targetX, p.targetY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Solid center
        ctx.fillStyle = `rgba(${photonColor.r}, ${photonColor.g}, ${photonColor.b}, 1)`;
        ctx.beginPath();
        ctx.arc(p.targetX, p.targetY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Light Source', lightSourceX - 35, lightSourceY + 50);
    
    const apertureLabel = params.apertureType === 'circular' ? 'Aperture' : 'Slits';
    const labelWidth = ctx.measureText(apertureLabel).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(slitX - labelWidth/2 - 8, 15, labelWidth + 16, 28);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(slitX - labelWidth/2 - 8, 15, labelWidth + 16, 28);
    ctx.fillStyle = '#222';
    ctx.fillText(apertureLabel, slitX - labelWidth/2, 35);
    
    const screenLabel = 'Screen';
    const screenLabelWidth = ctx.measureText(screenLabel).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(screenX + 20, 15, screenLabelWidth + 16, 28);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 20, 15, screenLabelWidth + 16, 28);
    ctx.fillStyle = '#222';
    ctx.fillText(screenLabel, screenX + 28, 35);
    
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(slitX, height - 50);
    ctx.lineTo(screenX, height - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#222';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`Distance: ${params.screenDistance}mm`, (slitX + screenX) / 2 - 45, height - 35);
    
    // Display particle count if in particle mode
    if (showParticles) {
      const arrivedCount = accumulatedParticles.filter(p => p.arrived).length;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(10, 10, 180, 40);
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 180, 40);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`Particles: ${arrivedCount}`, 20, 35);
    }
    
  }, [lightOn, params, wavePhase, animationActive, photonParticles, showParticles, accumulatedParticles]);
  
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    
    const ctx = graph.getContext('2d');
    const width = graph.width;
    const height = graph.height;
    
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    if (!lightOn) {
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.fillText('Turn on light to see intensity graph', width / 2 - 130, height / 2);
      return;
    }
    
    const numPoints = width;
    const screenRange = 20;
    const intensities = [];
    let maxIntensity = 0;
    
    for (let i = 0; i < numPoints; i++) {
      const y = (i / numPoints - 0.5) * screenRange;
      const intensity = calculateIntensity(y);
      intensities.push(intensity);
      maxIntensity = Math.max(maxIntensity, intensity);
    }
    
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    const color = wavelengthToRGB(params.wavelength, 1);
    ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < numPoints; i++) {
      const x = i;
      const normalizedIntensity = intensities[i] / maxIntensity;
      const y = height - (normalizedIntensity * height * 0.85 + height * 0.05);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    const threshold = 0.3;
    let maxima = [];
    for (let i = 1; i < numPoints - 1; i++) {
      if (intensities[i] > intensities[i-1] && intensities[i] > intensities[i+1] && intensities[i]/maxIntensity > threshold) {
        maxima.push({ index: i, intensity: intensities[i] });
      }
    }
    
    maxima.sort((a, b) => b.intensity - a.intensity);
    
    ctx.font = 'bold 12px Arial';
    maxima.forEach((max, idx) => {
      const x = max.index;
      const normalizedIntensity = max.intensity / maxIntensity;
      const y = height - (normalizedIntensity * height * 0.85 + height * 0.05);
      
      ctx.fillStyle = idx === 0 ? '#dc2626' : '#2563eb';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = idx === 0 ? '#dc2626' : '#2563eb';
      const label = idx === 0 ? 'Primary Max' : `Secondary Max ${idx}`;
      ctx.fillText(label, x - 40, y - 10);
    });
    
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Intensity Distribution', 10, 25);
    
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Position →', width - 80, height - 10);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Intensity →', -45, 0);
    ctx.restore();
    
  }, [lightOn, params]);
  
  const fresnelNumber = calculateFresnelNumber();
  
  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <Card className="bg-white border-gray-300 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600">
          <CardTitle className="text-3xl text-center text-white">
            DOUBLE SLIT USING FOURIER OPTICS
          </CardTitle>
          <p className="text-center text-blue-100">
            Interactive visualization with wave animation and particle accumulation
          </p>
        </CardHeader>
        <CardContent className="bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4 mt-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow">
                <h3 className="font-bold mb-3 text-lg text-gray-800">Controls</h3>
                
                <Button
                  onClick={() => setLightOn(!lightOn)}
                  className={`w-full py-6 text-lg font-bold mb-3 shadow-lg ${
                    lightOn 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white' 
                      : 'bg-gradient-to-r from-gray-300 to-gray-400 hover:from-gray-400 hover:to-gray-500 text-gray-700'
                  }`}
                >
                  {lightOn ? (
                    <>
                      <Lightbulb className="mr-2" size={24} />
                      LIGHT ON
                    </>
                  ) : (
                    <>
                      <LightbulbOff className="mr-2" size={24} />
                      LIGHT OFF
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setAnimationActive(!animationActive)}
                  className={`w-full mb-3 ${animationActive ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white border-2 border-blue-300 text-blue-700'}`}
                >
                  {animationActive ? (
                    <>
                      <Pause className="mr-2" size={18} />
                      Pause Animation
                    </>
                  ) : (
                    <>
                      <Play className="mr-2" size={18} />
                      Play Animation
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={() => setShowParticles(!showParticles)}
                  className={`w-full ${showParticles ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-100 border-2 border-purple-400 text-purple-900 hover:bg-purple-200'}`}
                >
                  {showParticles ? 'Show Wave Mode' : 'Show Particle Mode'}
                </Button>
                
                {showParticles && (
                  <Button
                    onClick={() => setAccumulatedParticles([])}
                    className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Trash2 className="mr-2" size={18} />
                    Clear Particles
                  </Button>
                )}
              </div>
              
              {showParticles && (
                <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-lg border border-purple-200 shadow">
                  <h3 className="font-bold mb-3 text-gray-800">Particle Settings</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Emission Rate: {params.particleEmissionRate} particles/sec
                    </label>
                    <Slider
                      value={[params.particleEmissionRate]}
                      onValueChange={([v]) => updateParam('particleEmissionRate', v)}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              

              <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-4 rounded-lg border border-purple-200 shadow space-y-4">
                <h3 className="font-bold mb-3 text-gray-800">Light Properties</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Wavelength: {params.wavelength} nm
                  </label>
                  <Slider
                    value={[params.wavelength]}
                    onValueChange={([v]) => updateParam('wavelength', v)}
                    min={380}
                    max={750}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Intensity: {(params.lightIntensity * 100).toFixed(0)}%
                  </label>
                  <Slider
                    value={[params.lightIntensity]}
                    onValueChange={([v]) => updateParam('lightIntensity', v)}
                    min={0.1}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Animation Speed: {params.animationSpeed.toFixed(1)}x
                  </label>
                  <Slider
                    value={[params.animationSpeed]}
                    onValueChange={([v]) => updateParam('animationSpeed', v)}
                    min={0.5}
                    max={3}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-yellow-100 p-4 rounded-lg border border-amber-200 shadow space-y-4">
                <h3 className="font-bold mb-3 text-gray-800">Aperture Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Aperture Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => updateParam('apertureType', 'single')}
                      className={`font-bold ${params.apertureType === 'single' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-100 border-2 border-amber-400 text-amber-900 hover:bg-amber-200'}`}
                      size="sm"
                    >
                      Single Slit
                    </Button>
                    <Button
                      onClick={() => updateParam('apertureType', 'double')}
                      className={`font-bold ${params.apertureType === 'double' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-100 border-2 border-amber-400 text-amber-900 hover:bg-amber-200'}`}
                      size="sm"
                    >
                      Double Slit
                    </Button>
                    <Button
                      onClick={() => updateParam('apertureType', 'multiple')}
                      className={`font-bold ${params.apertureType === 'multiple' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-100 border-2 border-amber-400 text-amber-900 hover:bg-amber-200'}`}
                      size="sm"
                    >
                      Multiple
                    </Button>
                    <Button
                      onClick={() => updateParam('apertureType', 'circular')}
                      className={`font-bold ${params.apertureType === 'circular' ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-100 border-2 border-amber-400 text-amber-900 hover:bg-amber-200'}`}
                      size="sm"
                    >
                      Circular
                    </Button>
                  </div>
                </div>
                
                {(params.apertureType === 'single' || params.apertureType === 'double' || params.apertureType === 'multiple') && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Slit Width: {params.slitWidth.toFixed(3)} mm
                    </label>
                    <Slider
                      value={[params.slitWidth]}
                      onValueChange={([v]) => updateParam('slitWidth', v)}
                      min={0.02}
                      max={0.3}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                )}
                
                {(params.apertureType === 'double' || params.apertureType === 'multiple') && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Slit Separation: {params.slitSeparation.toFixed(3)} mm
                    </label>
                    <Slider
                      value={[params.slitSeparation]}
                      onValueChange={([v]) => updateParam('slitSeparation', v)}
                      min={0.1}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                  </div>
                )}
                
                {params.apertureType === 'multiple' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Number of Slits: {params.numSlits}
                    </label>
                    <Slider
                      value={[params.numSlits]}
                      onValueChange={([v]) => updateParam('numSlits', Math.round(v))}
                      min={2}
                      max={8}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
                
                {params.apertureType === 'circular' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Aperture Diameter: {params.circularDiameter.toFixed(3)} mm
                    </label>
                    <Slider
                      value={[params.circularDiameter]}
                      onValueChange={([v]) => updateParam('circularDiameter', v)}
                      min={0.05}
                      max={0.5}
                      step={0.01}
                      className="w-full"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Screen Distance: {params.screenDistance} mm
                  </label>
                  <Slider
                    value={[params.screenDistance]}
                    onValueChange={([v]) => updateParam('screenDistance', v)}
                    min={500}
                    max={3000}
                    step={100}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white p-6 rounded-lg shadow-lg mt-4 border-2 border-gray-300">
                <h3 className="text-xl font-bold text-gray-800 mb-3">Formula</h3>
                <div className="bg-gray-50 p-4 rounded border border-gray-300">
                  <div className="text-center text-2xl font-mono mb-4">
                    I(y) = I₀ · [sinc(β)]² · cos²(δ)
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-bold text-blue-600">β = </span>
                      <span className="font-mono">π·a·y / (λ·L)</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200">
                      <span className="font-bold text-purple-600">δ = </span>
                      <span className="font-mono">π·d·y / (λ·L)</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-blue-100 px-2 py-1 rounded">a</span>
                      <span>= Slit Width ({params.slitWidth.toFixed(3)} mm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-purple-100 px-2 py-1 rounded">d</span>
                      <span>= Slit Separation ({params.slitSeparation.toFixed(3)} mm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-green-100 px-2 py-1 rounded">λ</span>
                      <span>= Wavelength ({params.wavelength} nm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-yellow-100 px-2 py-1 rounded">L</span>
                      <span>= Screen Distance ({params.screenDistance} mm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-red-100 px-2 py-1 rounded">y</span>
                      <span>= Position on screen</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold bg-orange-100 px-2 py-1 rounded">I(y)</span>
                      <span>= Intensity at position y</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white text-center">
                  Diffraction Pattern
                  {' - '}
                  {params.apertureType === 'single' && 'Single Slit'}
                  {params.apertureType === 'double' && 'Double Slit'}
                  {params.apertureType === 'multiple' && `Multiple Slits (${params.numSlits} slits)`}
                  {params.apertureType === 'circular' && 'Circular Aperture'}
                </h2>
                <p className="text-center text-blue-100 mt-1 text-sm">
                  {showParticles ? 'Particle Mode: Individual photons accumulating' : 'Wave Mode: Interference pattern'} • 
                  Wavelength: {params.wavelength}nm • 
                  Distance: {params.screenDistance}mm
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border-2 border-blue-200 shadow-lg">
                <h3 className="text-sm font-bold mb-2 text-gray-700">
                  {showParticles ? 'Particle Accumulation View' : 'Diffraction Setup with Wave Animation'}
                </h3>
                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={600}
                  className="w-full border-2 border-gray-300 rounded bg-gray-50"
                />
              </div>
              
              <div className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-lg">
                <h3 className="text-sm font-bold mb-2 text-gray-700">Intensity Distribution Graph</h3>
                <canvas
                  ref={graphRef}
                  width={1000}
                  height={225}
                  className="w-full border-2 border-gray-300 rounded bg-gray-50"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DiffractionSimulator;