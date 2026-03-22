export interface SpacingTheme {
  cornerRadius: {
    small: number;
    default: number;
    medium: number;
    large: number;
    circle: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    loose: number;
  };
}

export const volcengineDesignSpacing: SpacingTheme = {
  cornerRadius: {
    small: 2,
    default: 4,
    medium: 8,
    large: 16,
    circle: 9999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 13,
    lg: 14,
    xl: 16,
    xxl: 20,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
};
