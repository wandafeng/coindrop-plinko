import React from 'react';
import { RefreshCcw, Play, Clock, Heart, Trophy, DollarSign, XCircle, Skull, Diamond } from 'lucide-react';
import { GameMode } from '../types';

interface GameUIProps {
  score: number;
  missed: number;
  caught: number;
  timeLeft: number;
  lives: number;
  highScore: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gameMode: GameMode;
  onStart: () => void;
  onReset: () => void;
  onSetMode: (mode: GameMode) => void;
}

const GameUI: React.FC<GameUIProps> = ({ 
  score, 
  missed, 
  caught, 
  timeLeft,
  lives,
  highScore,
  isPlaying,
  isGameOver,
  gameMode,
  onStart,
  onReset,
  onSetMode
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-full max-w-md mx-auto h-auto">
      
      {/* Mode Switcher (Only when not playing) */}
      {!isPlaying && !isGameOver && (
          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl">
             <button 
                onClick={() => onSetMode('TIME')}
                className={`py-2 px-2 rounded-lg text-sm font-bold transition-all ${gameMode === 'TIME' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
             >
                限時搶劫
             </button>
             <button 
                onClick={() => onSetMode('SURVIVAL')}
                className={`py-2 px-2 rounded-lg text-sm font-bold transition-all ${gameMode === 'SURVIVAL' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
             >
                亡命天涯
             </button>
          </div>
      )}

      {/* Main Stats Split */}
      <div className="grid grid-cols-5 gap-3">
          {/* Left Block: Time OR Lives */}
          <div className="col-span-2 bg-slate-900 p-3 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
             {gameMode === 'TIME' ? (
                <>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">剩餘時間</span>
                    </div>
                    <span className={`text-4xl font-black font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {timeLeft}
                    </span>
                </>
             ) : (
                <>
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Heart size={16} className="text-red-500" />
                        <span className="text-xs font-bold uppercase">生命值</span>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                           <Heart 
                             key={i} 
                             size={14} 
                             className={`${i < lives ? 'fill-red-500 text-red-500' : 'text-slate-700 fill-slate-800'}`} 
                           />
                        ))}
                    </div>
                    <span className="text-xl font-bold mt-1 text-white">{lives}/5</span>
                </>
             )}
          </div>

          {/* Main Score */}
          <div className="col-span-3 bg-gradient-to-r from-yellow-800 to-amber-900 p-3 rounded-xl border border-yellow-700/50 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-full pointer-events-none"></div>
            <span className="text-yellow-300 text-xs uppercase tracking-wider font-bold mb-1">贓款總額</span>
            <div className="flex items-center gap-1 text-white">
              <span className="text-3xl font-black font-mono tracking-tighter w-full text-center">
                  ${score.toLocaleString()}
              </span>
            </div>
          </div>
      </div>

      {/* High Score & Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
           <div className="flex items-center gap-1 text-yellow-500 mb-1">
             <Trophy size={12} />
             <span className="text-[10px] font-bold">最高紀錄</span>
           </div>
           <span className="text-sm font-mono font-bold text-white truncate w-full text-center">${highScore.toLocaleString()}</span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
           <div className="flex items-center gap-1 text-blue-400 mb-1">
             <DollarSign size={12} />
             <span className="text-[10px] font-bold">得手次數</span>
           </div>
           <span className="text-lg font-mono font-bold text-white">{caught}</span>
        </div>

        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-700 flex flex-col items-center justify-center">
           <div className="flex items-center gap-1 text-red-400 mb-1">
             <XCircle size={12} />
             <span className="text-[10px] font-bold">錯過贓物</span>
           </div>
           <span className="text-lg font-mono font-bold text-white">{missed}</span>
        </div>
      </div>

      {/* Info Area */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-center">
         <p className="text-xs text-slate-400 flex flex-wrap justify-center gap-3">
            <span className="flex items-center"><span className="w-2 h-2 bg-blue-400 transform rotate-45 mr-1"></span>鑽石: $30k</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-yellow-400 rounded-sm mr-1"></span>金條: $8k</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-green-400 rounded-sm mr-1"></span>現鈔: $2k</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-red-800 rounded-full mr-1"></span>大便: -$2k</span>
         </p>
         {gameMode === 'SURVIVAL' && (
             <p className="text-xs text-red-400 mt-2 font-bold animate-pulse">
                <Skull size={10} className="inline mr-1"/>吃到大便會扣血，血歸零逮捕!
             </p>
         )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-3 mt-1">
        {!isPlaying ? (
           <button 
             onClick={onStart}
             className={`flex items-center justify-center gap-2 text-white py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-95 animate-pulse ${gameMode === 'SURVIVAL' ? 'bg-red-700 hover:bg-red-600 shadow-red-900/20' : 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20'}`}
           >
             <Play size={24} fill="currentColor" />
             {isGameOver ? '再次犯案' : (gameMode === 'SURVIVAL' ? '開始生存模式' : '開始限時模式')}
           </button>
        ) : (
           <button 
             onClick={onReset}
             className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-4 px-4 rounded-xl font-bold transition-all shadow-lg shadow-slate-900/20 active:scale-95"
           >
             <RefreshCcw size={20} />
             金盆洗手 (重置)
           </button>
        )}
      </div>
    </div>
  );
};

export default GameUI;