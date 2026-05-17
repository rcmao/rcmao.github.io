/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Web3Forms access key for the Message Tree panel (https://web3forms.com). */
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
