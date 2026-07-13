import type { Difficulty } from '../types';
import type { BotStrategy } from './base';
import { beginnerBot } from './beginner';
import { intermediateBot } from './intermediate';
import { expertBot } from './expert';

export function botFor(difficulty: Difficulty): BotStrategy {
  switch (difficulty) {
    case 'beginner':
      return beginnerBot;
    case 'intermediate':
      return intermediateBot;
    case 'expert':
      return expertBot;
  }
}

export { beginnerBot, intermediateBot, expertBot };
export type { BotStrategy, BotCtx } from './base';
