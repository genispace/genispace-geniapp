/**
 * Kit/AI — shadcn.io AI (Vercel AI Elements style) components adapted for
 * GeniSpace (design guideline §16.1). Sub-apps must consume chat-style AI UI
 * from here instead of hand-rolling panels.
 */
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from './conversation';
export { Message, MessageContent, MessageAvatar, type AiMessageRole } from './message';
export {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type AiToolState,
} from './tool';
export { Suggestions, Suggestion } from './suggestion';
export { Loader } from './loader';
export {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputSubmit,
  type PromptInputStatus,
} from './prompt-input';
