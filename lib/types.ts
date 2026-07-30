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
}

export const ROUND_NAMES: Record<number, string> = {
  0: 'Ready to dig',
  1: 'Round 1: Dig Deeper',
  2: 'Round 2: Sort the Mine',
  3: 'Round 3: Build the Tunnel',
  4: "Round 4: Fool's Gold",
  5: 'Game complete',
};

export const ROUND_SHORT_NAMES: Record<number, string> = {
  0: 'Start',
  1: 'Dig',
  2: 'Sort',
  3: 'Tunnel',
  4: "Fool's Gold",
  5: 'Done',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  dirt: 'Dirt',
  rock: 'Rock',
  gold: 'Gold',
  gold_nugget: 'Gold Nugget',
  foolsgold: "Fool's Gold",
  wildcard: 'Wild Card',
};
