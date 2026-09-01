interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_RBAC_RELAXED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
