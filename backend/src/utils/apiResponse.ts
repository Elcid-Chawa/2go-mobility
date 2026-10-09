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

  // TODO: Add update response method if needed in the future
  static updated<T>(res: Response, data: T, message = 'Resource updated successfully'): Response {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  }

  //TODO: Add delete response method if needed in the future
  static deleted(res: Response, message = 'Resource deleted successfully'): Response {
    return res.status(200).json({
      success: true,
      message,
    });
  }
}
