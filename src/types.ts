export type SectionType =
  | "paragraph"
  | "cta"
  | "imgtext"
  | "separator"
  | "fullwidthheader"
  | "fullwidthfooter";

export interface Section {
  id: string;
  type: SectionType;
  // common
  content?: string;
  // paragraph/imgtext
  label?: string;
  href?: string;
  img?: string;
  alt?: string;
  variant?: "left" | "right";
  // bands
  color?: string;
  textColor?: string;
  html?: string;
  fontSize?: number;
}

export interface BrandColors {
  primary: string;
  accent: string;
  text: string;
  bg: string;
  ctaColor: string;
}

export interface Brand {
  brandName: string;
  colors: BrandColors;
  HEADER: string;
  FOOTER: string;
}

export interface MergeItem {
  label: string;
  value: string;
}

export interface MergeGroup {
  group: string;
  items: MergeItem[];
}
