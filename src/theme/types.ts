import type { SpacingTheme } from './volcengine-design/spacing';
import type { ComponentsTheme } from './volcengine-design/components';

export type { SpacingTheme, ComponentsTheme };

export interface ColorTokenValue {
  variableRef?: string;
  fallbackHex: string;
}

export type ColorTheme = Record<string, ColorTokenValue>;

export interface Theme {
  colors: ColorTheme;
  spacing: SpacingTheme;
  components: ComponentsTheme;
}
