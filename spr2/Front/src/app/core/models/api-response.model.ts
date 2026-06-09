export interface ApiMessage {
  message: string;
}

export interface Paginated<T> extends ApiMessage {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  [key: string]: any;
}
