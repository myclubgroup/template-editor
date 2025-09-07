declare module "*.html?raw" {
  const content: string;
  export default content;
}
declare module "*.css";
declare module "react-quill-new";
declare module "react-color-palette";

declare global {
  interface Window {
    __BUILD_INFO__?: { buildNumber?: string; version?: string };
  }
}

export {};
