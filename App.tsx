import React, { useState, useCallback, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas';
import GameUI from './components/GameUI';
import { GameMode } from './types';

const TIME_LIMIT_DURATION = 60; // Seconds
const MAX_LIVES = 5;

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('TIME');
  
  // Game Stats
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_DURATION);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [caught, setCaught] = useState(0);
  const [highScores, setHighScores] = useState<{TIME: number, SURVIVAL: number}>({ TIME: 0, SURVIVAL: 0 });
  
  const timerRef = useRef<number | null>(null);

  // Load High Scores
  useEffect(() => {
    const saved = localStorage.getItem('money_catcher_scores');
    if (saved) {
      setHighScores(JSON.parse(saved));
    }
  }, []);

  const saveHighScore = useCallback((newScore: number) => {
    setHighScores(prev => {
      const updated = {
        ...prev,
        [gameMode]: Math.max(prev[gameMode], newScore)
      };
      localStorage.setItem('money_catcher_scores', JSON.stringify(updated));
      return updated;
    });
  }, [gameMode]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setIsGameOver(true);
    saveHighScore(score);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [score, saveHighScore]);

  const handleScore = useCallback((value: number) => {
    setScore(prev => prev + value);
    setCaught(prev => prev + 1);
  }, []);

  const handleMiss = useCallback(() => {
    setMissed(prev => prev + 1);
  }, []);

  const handleBombHit = useCallback(() => {
     // Triggered when hitting a Poop
     if (gameMode === 'SURVIVAL') {
        setLives(prev => {
           const newLives = prev - 1;
           if (newLives <= 0) {
              endGame();
              return 0;
           }
           return newLives;
        });
     }
     // In Time Mode, we just take the negative score (handled in handleScore) 
     // but visual effect still plays via GameCanvas
  }, [gameMode, endGame]);

  const handleStart = () => {
    setScore(0);
    setMissed(0);
    setCaught(0);
    setTimeLeft(TIME_LIMIT_DURATION);
    setLives(MAX_LIVES);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setScore(0);
    setMissed(0);
    setCaught(0);
    setTimeLeft(TIME_LIMIT_DURATION);
    setLives(MAX_LIVES);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Timer Logic (Only for TIME mode)
  useEffect(() => {
    if (gameMode === 'TIME' && isPlaying && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (gameMode === 'TIME' && timeLeft === 0 && isPlaying) {
       endGame();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft, gameMode, endGame]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row items-center justify-center gap-6 p-4 md:p-8 font-sans">
      
      {/* Game Container */}
      <div className="order-2 md:order-1 flex-1 w-full max-w-[500px] h-[600px] md:h-[700px] rounded-xl overflow-hidden border-4 border-slate-700 shadow-2xl relative bg-slate-900">
        <GameCanvas 
          onScore={handleScore}
          onMiss={handleMiss}
          onBombHit={handleBombHit}
          isPlaying={isPlaying}
          lives={lives}
          gameMode={gameMode}
        />
        
        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50 text-center p-6 animate-in fade-in duration-300">
             <h2 className="text-5xl font-black text-yellow-400 mb-2">
                {lives <= 0 && gameMode === 'SURVIVAL' ? '被逮捕!' : '搶劫結束!'}
             </h2>
             <p className="text-white text-xl mb-6">
                最終贓款: <span className="font-mono text-green-400">${score.toLocaleString()}</span>
             </p>
             <button 
                onClick={handleStart}
                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform hover:scale-105 active:scale-95"
             >
                再搶一次
             </button>
          </div>
        )}
      </div>

      {/* Sidebar / Controls */}
      <div className="order-1 md:order-2 w-full max-w-md">
        <div className="mb-4 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 drop-shadow-sm">
            銀行大盜
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            接住銀行掉落的金塊與鑽石，閃避陷阱！
          </p>
        </div>
        
        <GameUI 
          score={score}
          missed={missed}
          caught={caught}
          timeLeft={timeLeft}
          lives={lives}
          highScore={highScores[gameMode]}
          isPlaying={isPlaying}
          isGameOver={isGameOver}
          gameMode={gameMode}
          onStart={handleStart}
          onReset={handleReset}
          onSetMode={setGameMode}
        />
      </div>
      
    </div>
  );
}

export default App;