export const CLAUDE_MODEL = 'claude-haiku-5-5';
export const MAX_OUTPUT_TOKENS = 4000; // per model response; replies are short phone messages
export const TURN_TOKEN_LIMIT = 150_000; // per user message, across all tool-loop iterations
export const MAX_TOOL_ITERATIONS = 8; // hard stop for the tool loop
