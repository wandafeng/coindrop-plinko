export interface GameState {
  score: number;
  missed: number;
  caught: number;
}

export interface GameItem {
  id: number;
  x: number;
  y: number;
  speed: number;
  type: 'COIN_GOLD' | 'COIN_SILVER' | 'GEM' | 'BOMB' | 'BILL';
  value: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type GameMode = 'TIME' | 'SURVIVAL';