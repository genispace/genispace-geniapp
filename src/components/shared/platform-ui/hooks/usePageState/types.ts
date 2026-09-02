export type StorageType = 'localStorage' | 'sessionStorage';

export interface PageStateOptions<T extends Record<string, unknown>> {

  key: string;

  defaultValues: T;

  storageType?: StorageType;

  restoreOnMount?: boolean;
}

export interface PageStateReturn<T> {

  state: T;

  setState: React.Dispatch<React.SetStateAction<T>>;

  resetState: () => void;

  updateField: <K extends keyof T>(key: K, value: T[K]) => void;
}
