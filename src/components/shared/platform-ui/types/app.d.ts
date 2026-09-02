declare module '@/app/services/billing' {
  export const billingService: unknown;
}

declare module '@/app/context/TeamContext' {
  export const useTeam: () => unknown;
}

declare module '@/app/context/SpaceContext' {
  export const useSpace: () => unknown;
}

declare module '@/lib/hooks/use-mobile' {
  export const useIsMobile: () => boolean;
}

declare module '@/lib/hooks/use-toast' {
  export const useToast: () => unknown;
}

declare module '@/features/console/components/Markdown' {
  import type { ComponentType, ReactNode } from 'react';
  const Markdown: ComponentType<{ children?: ReactNode; className?: string }>;
  export default Markdown;
}

