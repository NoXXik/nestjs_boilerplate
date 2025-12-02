export class ApiResponse<T = any> {
  success: boolean;
  message: string;
  error: any | null;
  data: T | null;

  constructor(opts: {
    success: boolean;
    message: string;
    error?: any;
    data?: T;
  }) {
    this.success = opts.success;
    this.message = opts.message;
    this.error = opts.error ?? null;
    this.data = opts.data ?? null;
  }
}
