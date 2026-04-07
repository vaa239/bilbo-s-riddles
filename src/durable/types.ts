import type { PublishTarget } from "../lib/destinations.js";

export type RoundTarget = "PLAY" | "TEST";

export interface QuizRoundRecord {
  round_id: string;
  target: RoundTarget;
  chat_id: number;
  quiz_message_id: number;
  question_text: string;
  options: string[];
  correct_answer_normalized: string;
  explanation_text: string;
  posted_by_line: string;
  status: "OPEN" | "WON";
  won_by_message_id: number | null;
}

export interface OperatorSession {
  step:
    | "idle"
    | "awaiting_target"
    | "awaiting_question"
    | "awaiting_options"
    | "awaiting_correct_index"
    | "awaiting_explanation"
    | "awaiting_confirm";
  target?: PublishTarget;
  question?: string;
  options?: string[];
  correct_option_index?: number;
  explanation?: string;
}
