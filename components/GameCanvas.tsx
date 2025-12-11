import React, { useEffect, useRef, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { GameItem, GameMode } from '../types';

interface GameCanvasProps {
  onScore: (value: number) => void;
  onMiss: () => void;
  onBombHit: () => void;
  isPlaying: boolean;
  lives: number;
  gameMode: GameMode;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  text?: string;
}

interface Splatter {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface Building {
  x: number;
  w: number;
  h: number;
  windows: {x: number, y: number, on: boolean}[];
}

const SPAWN_RATE = 0.035; 
const GRAVITY_SPEED_BASE = 3;
const PLAYER_WIDTH = 70;
const PLAYER_HEIGHT = 90;
const BANK_HEIGHT = 100;

// Market Prices (Arcade Inflated)
const VALUES = {
  GEM: 30000,
  GOLD: 8000,
  BILL: 2000,
  COIN: 500,
  POOP: -2000
};

const GameCanvas: React.FC<GameCanvasProps> = ({ onScore, onMiss, onBombHit, isPlaying, lives, gameMode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const itemsRef = useRef<GameItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const playerXRef = useRef<number>(0);
  
  // Animation Refs
  const bagScaleRef = useRef<number>(1);
  const bagShakeRef = useRef<number>(0);
  const hitFlashRef = useRef<string | null>(null);
  
  // Splatter Effect Refs
  const splatterOpacityRef = useRef<number>(0);
  const splattersRef = useRef<Splatter[]>([]);

  // Background Refs
  const rainRef = useRef<RainDrop[]>([]);
  const buildingsRef = useRef<Building[]>([]);
  const bankWindowTickRef = useRef<number>(0);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Generate City Skyline once on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        setDimensions({ width: w, height: h });
        playerXRef.current = w / 2;

        // Generate Buildings
        const count = 15;
        const newBuildings: Building[] = [];
        let cx = 0;
        while(cx < w) {
           const bw = 30 + Math.random() * 60;
           const bh = 100 + Math.random() * 200;
           const windows = [];
           // Generate windows
           for(let wy = 10; wy < bh - 10; wy += 15) {
             for(let wx = 5; wx < bw - 5; wx += 12) {
               if(Math.random() > 0.4) {
                 windows.push({ x: wx, y: wy, on: Math.random() > 0.5 });
               }
             }
           }
           newBuildings.push({ x: cx, w: bw, h: bh, windows });
           cx += bw - 5; // Slight overlap
        }
        buildingsRef.current = newBuildings;
        
        // Init Rain
        const rain: RainDrop[] = [];
        for(let i=0; i<100; i++) {
          rain.push({
            x: Math.random() * w,
            y: Math.random() * h,
            length: 10 + Math.random() * 20,
            speed: 10 + Math.random() * 10,
            opacity: 0.1 + Math.random() * 0.3
          });
        }
        rainRef.current = rain;
      }
    };
    
    window.addEventListener('resize', updateSize);
    updateSize();
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleInput = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    playerXRef.current = Math.max(PLAYER_WIDTH/2, Math.min(dimensions.width - PLAYER_WIDTH/2, x));
  };

  const handleMouseMove = (e: React.MouseEvent) => handleInput(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleInput(e.touches[0].clientX);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const spawnItem = () => {
      const rand = Math.random();
      let type: GameItem['type'] = 'COIN_GOLD';
      let value = VALUES.GOLD;
      let radius = 12;
      let speed = GRAVITY_SPEED_BASE + Math.random() * 2;

      // Adjusted Spawn Logic for Heist Theme
      if (rand < 0.20) {
        type = 'BOMB'; // Still Poop/Trap
        value = VALUES.POOP; 
        radius = 18;
        speed = GRAVITY_SPEED_BASE * 1.5;
      } else if (rand < 0.35) {
        type = 'BILL'; // Cash Stacks
        value = VALUES.BILL;
        radius = 22; 
        speed = GRAVITY_SPEED_BASE * 1.1; 
      } else if (rand < 0.45) {
        type = 'GEM'; // Diamonds
        value = VALUES.GEM; // High value
        radius = 16;
        speed = GRAVITY_SPEED_BASE * 3.0; // Fast!
      } else if (rand < 0.60) {
        type = 'COIN_SILVER'; // Silver Coins
        value = VALUES.COIN;
        radius = 12;
        speed = GRAVITY_SPEED_BASE * 1.8;
      } else {
        type = 'COIN_GOLD'; // Gold Bars
        value = VALUES.GOLD;
        radius = 20; // Bigger for bar shape
        speed = GRAVITY_SPEED_BASE * 2.0;
      }

      itemsRef.current.push({
        id: Date.now() + Math.random(),
        x: Math.random() * (dimensions.width - 60) + 30,
        y: BANK_HEIGHT - 20, // Spawn from inside bank
        speed,
        type,
        value,
        radius,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * (type === 'BILL' || type === 'COIN_GOLD' ? 0.05 : 0.15) 
      });
    };

    const update = () => {
      if (isPlaying) {
        if (Math.random() < SPAWN_RATE) {
          spawnItem();
        }
      }

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // --- 0. Dynamic Background ---
      // Distant City
      const buildingBaseY = dimensions.height;
      buildingsRef.current.forEach((b, i) => {
         // Parallax-ish shift based on player position (subtle)
         const parallax = (playerXRef.current - dimensions.width/2) * 0.05 * (i % 2 === 0 ? 1 : -1);
         
         ctx.fillStyle = '#0f172a'; // Deep slate
         ctx.fillRect(b.x + parallax, buildingBaseY - b.h, b.w, b.h);
         
         // Windows
         b.windows.forEach(w => {
           if (w.on) {
             // Twinkle logic
             if (Math.random() > 0.995) w.on = false;
             ctx.fillStyle = i % 3 === 0 ? '#fef3c7' : '#e2e8f0'; // Warm vs Cool lights
             ctx.globalAlpha = 0.6 + Math.random() * 0.4;
             ctx.fillRect(b.x + parallax + w.x, buildingBaseY - b.h + w.y, 4, 6);
             ctx.globalAlpha = 1.0;
           } else {
             if (Math.random() > 0.999) w.on = true;
           }
         });
      });

      // Rain Effect (Heavier if low lives in Survival)
      const isRaining = (gameMode === 'SURVIVAL' && lives <= 2) || (Math.random() > 0.5); // Always some rain or logic?
      // Let's make rain persistent but heavier when danger
      const rainDensity = (gameMode === 'SURVIVAL' && lives <= 2) ? 2 : 0.5;
      
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      for (const drop of rainRef.current) {
         if (Math.random() > rainDensity) continue; // Skip some drops if light rain

         drop.y += drop.speed;
         if (drop.y > dimensions.height) {
            drop.y = -20;
            drop.x = Math.random() * dimensions.width;
         }
         
         ctx.globalAlpha = drop.opacity;
         ctx.beginPath();
         ctx.moveTo(drop.x, drop.y);
         ctx.lineTo(drop.x - 2, drop.y + drop.length); // Slanted rain
         ctx.stroke();
      }
      ctx.globalAlpha = 1.0;


      // --- 1. Draw Bank Background (Top) ---
      // Bank Alarm Logic
      bankWindowTickRef.current++;
      const isAlarm = gameMode === 'SURVIVAL' && lives <= 1;
      const alarmOn = isAlarm && Math.floor(bankWindowTickRef.current / 10) % 2 === 0;

      // Pillars
      ctx.fillStyle = '#1e293b'; 
      const pillarCount = 6;
      const pillarWidth = 20;
      const spacing = dimensions.width / pillarCount;
      for (let i = 0; i <= pillarCount; i++) {
          ctx.fillRect(i * spacing - pillarWidth/2, 50, pillarWidth, BANK_HEIGHT);
      }
      
      // Roof/Pediment
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.lineTo(dimensions.width, 50);
      ctx.lineTo(dimensions.width, 10);
      ctx.lineTo(0, 10);
      ctx.fill();
      
      // Bank Windows (Between pillars)
      for (let i = 0; i < pillarCount; i++) {
         const wx = i * spacing + (spacing - pillarWidth)/2;
         const wy = 60;
         const ww = spacing - pillarWidth * 2;
         const wh = 30;
         
         // Window glass
         if (alarmOn) {
            ctx.fillStyle = '#ef4444'; // Red Alarm
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
         } else {
            ctx.fillStyle = '#475569'; // Dark Glass
            ctx.shadowBlur = 0;
         }
         ctx.fillRect(wx - ww/4, wy, ww/2, wh);
         ctx.shadowBlur = 0;
      }

      // Bank Sign
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(dimensions.width/2 - 60, 20, 120, 25);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('CENTRAL BANK', dimensions.width/2, 38);

      // Bottom shadow of bank
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, BANK_HEIGHT, dimensions.width, 20);


      // --- 2. Draw Player (The Thief) ---
      const pX = playerXRef.current;
      const pY = dimensions.height - PLAYER_HEIGHT + 10;
      
      if (bagScaleRef.current > 1) {
        bagScaleRef.current -= 0.05; 
      } else {
        bagScaleRef.current = 1;
      }

      let shakeOffset = 0;
      if (bagShakeRef.current > 0) {
        shakeOffset = (Math.random() - 0.5) * 10;
        bagShakeRef.current--;
      }
      
      // Bag (Behind)
      const bagY = pY - 10;
      const currentScale = bagScaleRef.current;
      
      ctx.save();
      ctx.translate(pX + shakeOffset, bagY);
      ctx.scale(currentScale, currentScale); 
      
      if (hitFlashRef.current && bagScaleRef.current > 1.05) {
         ctx.fillStyle = hitFlashRef.current; 
      } else {
         ctx.fillStyle = '#b45309'; 
      }
      
      ctx.beginPath();
      ctx.ellipse(0, 0, 40, 25, 0, 0, Math.PI, false); // Bottom half
      ctx.lineTo(-30, -30); // Neck left
      ctx.lineTo(30, -30); // Neck right
      ctx.fill();
      
      // Dollar Sign on Bag
      ctx.fillStyle = '#fcd34d';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Bag Opening
      ctx.beginPath();
      ctx.ellipse(0, -30, 30, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#451a03'; // Dark inside
      ctx.fill();
      
      ctx.restore();

      // Thief Body
      ctx.fillStyle = '#0f172a'; // Black pants
      ctx.fillRect(pX - 15 + shakeOffset, pY + 40, 10, 30);
      ctx.fillRect(pX + 5 + shakeOffset, pY + 40, 10, 30);

      // Torso (Striped Shirt)
      ctx.fillStyle = '#fff';
      ctx.fillRect(pX - 20 + shakeOffset, pY, 40, 45); 
      ctx.fillStyle = '#0f172a'; // Black stripes
      for(let y = pY + 5; y < pY + 45; y+=10) {
         ctx.fillRect(pX - 20 + shakeOffset, y, 40, 5);
      }
      
      // Arms
      ctx.strokeStyle = '#0f172a'; 
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pX - 20 + shakeOffset, pY + 10);
      ctx.lineTo(pX - 30 + shakeOffset, pY - 10); 
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pX + 20 + shakeOffset, pY + 10);
      ctx.lineTo(pX + 30 + shakeOffset, pY - 10); 
      ctx.stroke();

      // Head
      ctx.fillStyle = '#fca5a5'; // Skin
      ctx.beginPath();
      ctx.arc(pX + shakeOffset, pY - 15, 18, 0, Math.PI * 2);
      ctx.fill();
      
      // Mask
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(pX - 16 + shakeOffset, pY - 20, 32, 10, 5);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = 'white';
      if (bagShakeRef.current > 0) {
          ctx.font = '10px sans-serif';
          ctx.fillText('x', pX - 8 + shakeOffset, pY - 15);
          ctx.fillText('x', pX + 8 + shakeOffset, pY - 15);
      } else {
          ctx.beginPath();
          ctx.arc(pX - 8 + shakeOffset, pY - 15, 2, 0, Math.PI * 2);
          ctx.arc(pX + 8 + shakeOffset, pY - 15, 2, 0, Math.PI * 2);
          ctx.fill();
      }

      // Beanie Hat
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(pX + shakeOffset, pY - 20, 19, Math.PI, 0); 
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(pX - 18 + shakeOffset, pY - 20);
      ctx.lineTo(pX + 18 + shakeOffset, pY - 20);
      ctx.stroke();


      // --- 3. Items ---
      for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];
        
        if (isPlaying) {
          item.y += item.speed;
          item.rotation += item.rotationSpeed;
        }

        // Collision
        const dx = (pX + shakeOffset) - item.x;
        const dy = bagY - item.y; // Collision with bag top
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < (item.radius + 40) && isPlaying) {
          onScore(item.value);
          itemsRef.current.splice(i, 1);
          
          bagScaleRef.current = 1.3; 
          
          if (item.type === 'BOMB') {
             // POOP HIT
             onBombHit();
             hitFlashRef.current = '#713f12'; 
             bagShakeRef.current = 20;
             
             // Trigger Screen Splatter
             splatterOpacityRef.current = 1.0;
             splattersRef.current = [];
             for (let s=0; s<6; s++) {
                 splattersRef.current.push({
                     x: Math.random() * dimensions.width,
                     y: Math.random() * dimensions.height,
                     scale: 2 + Math.random() * 3,
                     rotation: (Math.random() - 0.5),
                 });
             }
             
             particlesRef.current.push({
                x: item.x,
                y: item.y - 20,
                vx: 0,
                vy: -2,
                life: 1.5,
                color: '#ef4444',
                text: `噁! -$${Math.abs(item.value).toLocaleString()}`
             });

          } else {
             // Good HIT
             hitFlashRef.current = '#fbbf24'; 
             
             const pColor = item.type === 'GEM' ? '#ec4899' : (item.type === 'BILL' ? '#86efac' : '#fbbf24');
             
             particlesRef.current.push({
                x: item.x,
                y: item.y - 20,
                vx: 0,
                vy: -1,
                life: 1.0,
                color: '#fff',
                text: `+$${item.value.toLocaleString()}`
             });
             
             if (item.type === 'BILL' || item.type === 'COIN_GOLD') {
                confetti({
                  particleCount: 5,
                  spread: 30,
                  origin: { x: item.x / dimensions.width, y: item.y / dimensions.height },
                  colors: ['#ffd700', '#fcd34d']
                });
             }
             if (item.type === 'GEM') {
                confetti({
                  particleCount: 15,
                  spread: 40,
                  origin: { x: item.x / dimensions.width, y: item.y / dimensions.height },
                  colors: ['#3b82f6', '#60a5fa', '#ffffff']
                });
             }
          }
          continue;
        }

        if (item.y > dimensions.height + 20) {
          if (isPlaying && item.type !== 'BOMB') {
             onMiss();
          }
          itemsRef.current.splice(i, 1);
          continue;
        }

        // Draw Item
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation);
        
        if (item.type === 'BOMB') {
           // POOP
           ctx.fillStyle = '#654321'; 
           ctx.strokeStyle = '#3e2723';
           
           ctx.beginPath();
           ctx.ellipse(0, 5, 18, 10, 0, 0, Math.PI * 2);
           ctx.fill();
           ctx.beginPath();
           ctx.ellipse(0, -3, 14, 8, 0, 0, Math.PI * 2);
           ctx.fill();
           ctx.beginPath();
           ctx.ellipse(0, -10, 8, 5, 0, 0, Math.PI * 2);
           ctx.fill();
           
           ctx.fillStyle = 'white';
           ctx.beginPath();
           ctx.arc(-5, -2, 3, 0, Math.PI*2);
           ctx.arc(5, -2, 3, 0, Math.PI*2);
           ctx.fill();
           ctx.fillStyle = 'black';
           ctx.beginPath();
           ctx.arc(-5, -2, 1, 0, Math.PI*2);
           ctx.arc(5, -2, 1, 0, Math.PI*2);
           ctx.fill();

        } else if (item.type === 'BILL') {
            // Money Stack
            ctx.fillStyle = '#86efac'; 
            ctx.strokeStyle = '#15803d'; 
            
            const billW = 36;
            const billH = 20;
            ctx.fillRect(-billW/2, -billH/2, billW, billH);
            ctx.strokeRect(-billW/2, -billH/2, billW, billH);
            
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI*2);
            ctx.stroke();
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);

        } else if (item.type === 'COIN_GOLD') {
            // GOLD BAR
            const w = 40;
            const h = 15;
            // Draw Trapezoid for 3D bar effect
            ctx.fillStyle = '#fbbf24'; // Lighter top
            ctx.beginPath();
            ctx.moveTo(-w/2 + 5, -h/2);
            ctx.lineTo(w/2 - 5, -h/2);
            ctx.lineTo(w/2, h/2);
            ctx.lineTo(-w/2, h/2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Shininess
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.moveTo(-w/2 + 8, -h/2 + 3);
            ctx.lineTo(-w/2 + 18, -h/2 + 3);
            ctx.lineTo(-w/2 + 10, h/2 - 3);
            ctx.lineTo(-w/2 + 2, h/2 - 3);
            ctx.fill();

            // 999
            ctx.fillStyle = '#92400e';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.rotate(-item.rotation); 
            ctx.fillText('999.9', 0, 0);

        } else if (item.type === 'GEM') {
            // DIAMOND
            ctx.fillStyle = '#60a5fa'; // Blue
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            ctx.beginPath();
            ctx.moveTo(0, -15); // Top point
            ctx.lineTo(12, -5); // Right shoulder
            ctx.lineTo(0, 15); // Bottom point
            ctx.lineTo(-12, -5); // Left shoulder
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Facets
            ctx.beginPath();
            ctx.moveTo(-12, -5);
            ctx.lineTo(12, -5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.stroke();

        } else { 
            // SILVER COIN (Small change)
            ctx.beginPath();
            ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#94a3b8';
            ctx.strokeStyle = '#475569';
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = `bold 10px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.rotate(-item.rotation);
            ctx.fillText('$', 0, 1);
        }

        ctx.restore();
      }

      // 4. Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, p.life);
        if (p.text) {
          ctx.fillStyle = p.color;
          ctx.font = 'bold 22px Inter';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 4;
          ctx.fillText(p.text, p.x, p.y);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }

      // --- 5. POOP SCREEN SPLATTER EFFECT ---
      if (splatterOpacityRef.current > 0) {
          ctx.globalAlpha = splatterOpacityRef.current;
          
          // Full screen brown tint
          ctx.fillStyle = 'rgba(66, 33, 11, 0.7)';
          ctx.fillRect(0, 0, dimensions.width, dimensions.height);
          
          // Draw Giant Emojis
          for (const s of splattersRef.current) {
              ctx.save();
              ctx.translate(s.x, s.y);
              ctx.rotate(s.rotation);
              ctx.scale(s.scale, s.scale);
              ctx.font = '50px serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('💩', 0, 0);
              ctx.restore();
          }

          ctx.globalAlpha = 1.0;
          splatterOpacityRef.current -= 0.015; // Slow fade out
      }

      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(requestRef.current);
  }, [dimensions, isPlaying, onScore, onMiss, onBombHit, lives, gameMode]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-none bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-500 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-20 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
      </div>
      
      <canvas 
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block touch-none relative z-10"
      />
      
      {!isPlaying && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 backdrop-blur-sm p-4 pointer-events-none">
            <div className="text-center animate-bounce-slow">
               <div className="text-yellow-400 text-4xl font-black mb-2 tracking-widest drop-shadow-lg">
                  行動代號：洗劫銀行
               </div>
               <div className="text-slate-300 text-lg">
                  接住 <span className="text-yellow-400 font-bold">金塊</span> & <span className="text-blue-400 font-bold">鑽石</span>
                  <br/>
                  小心 <span className="text-red-500 font-bold">大便</span> 陷阱!
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default GameCanvas;