export const CLAUDE_MODEL = 'claude-haiku-5-5';
export const MAX_OUTPUT_TOKENS = 4000; // per model response; replies are short phone messages
export const TURN_TOKEN_LIMIT = 150_000; // per user message, across all tool-loop iterations
export const MAX_TOOL_ITERATIONS = 8; // hard stop for the tool loop
export const AI_DAILY_LIMIT = 30; // /ai questions per user per Kyiv day
export const AI_HISTORY_TURNS = 3; // previous question/answer pairs sent as context
export const AI_HISTORY_TTL_MS = 30 * 60 * 1000; // older context is dropped
