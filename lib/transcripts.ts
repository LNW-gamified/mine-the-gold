import type { Category } from "./types";

export interface TranscriptLine {
  text: string;
  tier: Category;
  points: number;
}

export interface FollowUpOption {
  text: string;
  correct: boolean;
}

export interface BonusTranscript {
  label: string;
  lines: TranscriptLine[];
  followUps: FollowUpOption[];
}

export const BONUS_TRANSCRIPTS: BonusTranscript[] = [
  {
    label: "Late-arriving opportunities",
    lines: [
      { text: "We hear about things too late.", tier: "dirt", points: 2 },
      { text: "Capture managers spend hours each week trying to piece together what's out there.", tier: "rock", points: 2 },
      { text: "We've missed several recompetes because we found out too late to prepare a strong bid.", tier: "gold", points: 5 },
      { text: "A single missed recompete could cost us $10M in annual revenue.", tier: "gold_nugget", points: 10 },
    ],
    followUps: [
      { text: "How many recompetes are coming up in the next twelve months?", correct: false },
      { text: "What would it take to hear about opportunities early enough to actually influence them?", correct: false },
      { text: "Walk me through what happened on that missed $10M recompete. What would have needed to be different?", correct: true },
    ],
  },
  {
    label: "Proposal rework",
    lines: [
      { text: "Our proposal team feels stretched thin.", tier: "dirt", points: 2 },
      { text: "Proposal teams often get the handoff later than they should.", tier: "rock", points: 2 },
      { text: "We've been rushing more submissions, and quality has suffered.", tier: "gold", points: 5 },
      { text: "Our win rate has slipped from the low 30s to the low 20s over the past two quarters.", tier: "gold_nugget", points: 10 },
    ],
    followUps: [
      { text: "How many proposals go out each quarter?", correct: false },
      { text: "What's the plan to fix the handoff timing?", correct: false },
      { text: "What's the connection between the rushed submissions and that ten-point drop in win rate?", correct: true },
    ],
  },
];
