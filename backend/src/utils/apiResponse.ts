import { Response } from 'express';

export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created<T>(res: Response, data: T, message = 'Resource created successfully'): Response {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, message = 'An error occurred', statusCode = 500, errors: any = null): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors ? { errors } : {}),
    });
  }
}
