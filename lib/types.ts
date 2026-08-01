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

export type TunnelStage = 'dirt' | 'rock' | 'nugget';

export interface TunnelDecision {
  id: string;
  scenario_id: string;
  stage: TunnelStage;
  correct_response: string;
  wrong_response: string;
}

export interface GoldChecklistItem {
  id: string;
  text: string;
  has_number: boolean;
  has_consequence: boolean;
  has_right_person: boolean;
  is_gold: boolean;
  next_question: string | null;
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
  explanation: string | null;
}

// Round 1: 7 statements x 2 points = 14.
// Round 2: placement (dirt 3 + rock 3 + nugget 4 = 10) + perfect-tunnel
// bonus (2) + the 3 pitch-or-dig decisions (dirt 2 + rock 3 + gold 4 = 9)
// = 21.
// Round 3: Stage A's 6 checklist items x 3 points (one per sign) = 18,
// plus Stage B's 12 timed Dirt/Rock/Gold cards x 2 points = 24, for 42.
// Total: 14 + 21 + 42 = 77.
export const MAX_POSSIBLE_SCORE = 77;

export const ROUND_NAMES: Record<number, string> = {
  0: 'Ready to dig',
  1: 'Round 1: Spot the Signal',
  2: 'Round 2: Dig to Gold',
  3: 'Round 3: Collect the Gold',
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
