import { useEffect } from 'react';

let bodyScrollLockCount = 0;

type Snapshot = {
  htmlOverflow: string;
  bodyOverflow: string;
};

let snapshot: Snapshot | null = null;

function applyScrollLock() {
  const html = document.documentElement;
  snapshot = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: document.body.style.overflow,
  };

  html.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

function releaseScrollLock() {
  if (!snapshot) return;
  const html = document.documentElement;
  html.style.overflow = snapshot.htmlOverflow;
  document.body.style.overflow = snapshot.bodyOverflow;
  snapshot = null;
}

export function useLockBodyScroll(lock: boolean) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!lock) return;

    const isFirst = bodyScrollLockCount === 0;
    if (isFirst) {
      applyScrollLock();
    }
    bodyScrollLockCount++;

    return () => {
      bodyScrollLockCount--;
      if (bodyScrollLockCount === 0) {
        releaseScrollLock();
      }
    };
  }, [lock]);
}
