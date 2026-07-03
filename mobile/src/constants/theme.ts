export const Colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A25',
  secondary: '#1A1A2E',
  background: '#0F0F0F',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  border: '#3A3A3C',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#636366',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  info: '#0A84FF',
  overlay: 'rgba(0,0,0,0.7)',
  tabBar: '#1C1C1E',
};

export const GradeColors: Record<string, string> = {
  VB: '#48C774',
  V0: '#48C774',
  V1: '#48C774',
  V2: '#48C774',
  V3: '#3273DC',
  V4: '#3273DC',
  V5: '#FFD700',
  V6: '#FFD700',
  V7: '#FF8C00',
  V8: '#FF8C00',
  V9: '#FF453A',
  V10: '#FF453A',
  V11: '#BF5AF2',
  V12: '#BF5AF2',
  V13: '#AC8E68',
  V14: '#AC8E68',
  V15: '#FFFFFF',
  V16: '#FFFFFF',
  V17: '#FFFFFF',
};

export const ResultColors: Record<string, string> = {
  ATTEMPTED: '#636366',
  WORKING: '#3273DC',
  ALMOST: '#FF9F0A',
  PROJECT: '#BF5AF2',
  COMPLETED: '#30D158',
  FLASH: '#FFD700',
  ONSIGHT: '#FF6B35',
  REPEAT: '#48C774',
  COMPETITION_SEND: '#FF6B35',
  PERSONAL_BEST: '#FFD700',
};

export const ResultLabels: Record<string, string> = {
  ATTEMPTED: 'Attempted',
  WORKING: 'Working',
  ALMOST: 'Almost',
  PROJECT: 'Project',
  COMPLETED: 'Completed',
  FLASH: 'Flash',
  ONSIGHT: 'Onsight',
  REPEAT: 'Repeat',
  COMPETITION_SEND: 'Comp Send',
  PERSONAL_BEST: 'Personal Best',
};

export const GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
};
