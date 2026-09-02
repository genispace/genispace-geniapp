import { useEffect } from 'react';
import { APP_TITLE } from '@/lib/config';

interface TitleManagerProps {
  title?: string;
  prefix?: string;
  suffix?: string;
}

export default function TitleManager({ title, prefix, suffix }: TitleManagerProps) {
  useEffect(() => {
    let pageTitle = title || APP_TITLE;

    if (prefix) {
      pageTitle = `${prefix} - ${pageTitle}`;
    }

    if (suffix) {
      pageTitle = `${pageTitle} - ${suffix}`;
    }

    document.title = pageTitle;

    return () => {
      document.title = APP_TITLE;
    };
  }, [title, prefix, suffix]);

  return null; 
}

export function usePageTitle(title?: string, prefix?: string, suffix?: string) {
  useEffect(() => {
    let pageTitle = title || APP_TITLE;

    if (prefix) {
      pageTitle = `${prefix} - ${pageTitle}`;
    }

    if (suffix) {
      pageTitle = `${pageTitle} - ${suffix}`;
    }

    document.title = pageTitle;

    return () => {
      document.title = APP_TITLE;
    };
  }, [title, prefix, suffix]);
}
