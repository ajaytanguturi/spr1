export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string;
  errors?: ApiFieldError[];
}

export interface ApiFieldError {
  msg: string;
  path?: string;
}

export interface PaginatedData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ApiMessage = ApiResponse<Record<string, never>>;
