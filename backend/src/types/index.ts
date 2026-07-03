import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    profileImageUrl: string | null;
    climberRating: number;
    xpPoints: number;
    level: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export const GRADES = ['VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17'];

export function gradeToNumber(grade: string): number {
  if (grade === 'VB') return -1;
  const num = parseInt(grade.replace('V', ''), 10);
  return isNaN(num) ? -1 : num;
}

export function isValidGrade(grade: string): boolean {
  return GRADES.includes(grade);
}
