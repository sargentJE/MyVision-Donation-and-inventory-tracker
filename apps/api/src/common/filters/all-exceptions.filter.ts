import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Catches any error that isn't an HttpException (which is handled by HttpExceptionFilter).
 * Prevents stack trace leaks and ensures consistent error envelope.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // Let HttpException pass through to the dedicated filter
    if (exception instanceof HttpException) {
      throw exception;
    }

    this.logger.error('Unhandled exception', exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  }
}
