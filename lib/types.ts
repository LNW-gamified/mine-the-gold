export type Category = 'dirt' | 'rock' | 'gold' | 'gold_nugget' | 'foolsgold' | 'wildcard';

export interface Card {
  id: string;
  code: string;
  category: Category;
  text: string;
  points: number;
  explanation: string | null;
}

export interface MineShaftScenario {
  id: string;
  title: string;
  dirt_text: string;
  rock_text: string;
  gold_text: string;
  nugget_text: string;
  dirt_explanation: string | null;
  rock_explanation: string | null;
  gold_explanation: string | null;
  nugget_explanation: string | null;
}

export interface Session {
  id: string;
  label: string;
  room_code: string;
  active: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  session_id: string;
  name: string;
  score: number;
  created_at: string;
  current_round: number;
}

export interface DigDeeperPrompt {
  id: string;
  dirt_card_id: string;
  tier: 'level2' | 'level3' | 'impact';
  question_text: string;
  points: number;
  explanation: string | null;
}

export type SignalType = 'frustration' | 'timing' | 'habit' | 'trial_error' | 'goals' | 'uncertainty' | 'gaps';

export interface SignalStatement {
  id: string;
  text: string;
  signal_type: SignalType;
  clue_phrases: string[];
  ask_question: string;
  explanation: string | null;
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  frustration: 'Frustration',
  timing: 'Timing',
  habit: 'Habit',
  trial_error: 'Trial & Error',
  goals: 'Goals',
  uncertainty: 'Uncertainty',
  gaps: 'Gaps',
};

export interface Submission {
  id: string;
  session_id: string;
  team_id: string;
  round: number;
  card_id: string | null;
  answer_text: string | null;
  placed_category: string | null;
  correct: boolean | null;
  points_awarded: number;
  facilitator_scored: boolean;
  created_at: string;
  explanation: string | null;
}

// Round 1 Stage A's max: 7 statements (one per signal type) x 2 points for a
// fully-correct read = 14. Rounds 2 and 3 are placeholders with no scoring
// yet (Phase 3), so this undercounts the eventual real max - revisit once
// their content and points land.
export const MAX_POSSIBLE_SCORE = 14;

export const ROUND_NAMES: Record<number, string> = {
  0: 'Ready to dig',
  1: 'Round 1: Spot the Signal',
  2: 'Round 2: Dig to Gold',
  3: 'Round 3: Know Your Gold',
  4: 'Game complete',
};

export const ROUND_SHORT_NAMES: Record<number, string> = {
  0: 'Start',
  1: 'Signal',
  2: 'Dig',
  3: 'Gold',
  4: 'Done',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  dirt: 'Dirt',
  rock: 'Rock',
  gold: 'Gold',
  gold_nugget: 'Gold Nugget',
  foolsgold: "Fool's Gold",
  wildcard: 'Wild Card',
};
