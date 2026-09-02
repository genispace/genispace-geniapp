export type AgentIdentitySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export const agentIdentitySizeClass: Record<AgentIdentitySize, string> = {
  xs: 'size-6 text-[10px]',
  sm: 'size-7 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-20 text-xl',
};

const AGENT_IDENTITY_TONES = [
  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-200',
  'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/70 dark:bg-sky-950/50 dark:text-sky-200',
  'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/70 dark:bg-cyan-950/50 dark:text-cyan-200',
  'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
] as const;

const CJK_UNIFIED_RE = /[\u4e00-\u9fff]/;
const WORD_TOKEN_RE = /[\p{L}\p{N}]+/gu;

export function getAgentIdentityInitials(name: string): string {
  const normalizedName = name.trim();
  if (!normalizedName) return 'AI';

  const characters = Array.from(normalizedName);
  if (CJK_UNIFIED_RE.test(normalizedName)) {
    return characters.filter((character) => CJK_UNIFIED_RE.test(character)).slice(0, 2).join('');
  }

  const words = normalizedName.match(WORD_TOKEN_RE) ?? [];
  const firstWord = words[0] ?? '';
  const secondWord = words[1] ?? '';
  if (secondWord) {
    return `${Array.from(firstWord)[0]}${Array.from(secondWord)[0]}`.toUpperCase();
  }

  return Array.from(firstWord).slice(0, 2).join('').toUpperCase() || 'AI';
}

export function getAgentIdentityTone(name: string): string {
  let hash = 0;
  for (const character of name.trim() || 'agent') {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return AGENT_IDENTITY_TONES[(hash >>> 0) % AGENT_IDENTITY_TONES.length];
}
