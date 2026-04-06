import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

interface ExceptionBody {
  error: string;
  message: string;
  detail?: Record<string, string[]>;
  [key: string]: unknown;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const body: ExceptionBody = {
      error: this.getErrorCode(status),
      message: '',
    };

    if (typeof exceptionResponse === 'string') {
      body.message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const res = exceptionResponse as Record<string, unknown>;

      // ValidationPipe returns { message: string[], error: string, statusCode: number }
      if (Array.isArray(res.message) && status === 400) {
        body.message = 'Validation failed';
        body.detail = this.parseValidationErrors(res.message as string[]);
      } else {
        body.message =
          typeof res.message === 'string'
            ? res.message
            : 'An error occurred';
      }

      // Pass through extra fields (e.g. conflicts, currentStatus, attemptedAction).
      // Use custom error code only if it's all-uppercase (e.g. ACTIVE_DEPENDENTS),
      // otherwise NestJS's default mixed-case codes (e.g. 'Conflict') are ignored.
      const { message: _m, statusCode: _s, error: resError, ...extra } = res;
      if (
        typeof resError === 'string' &&
        resError === resError.toUpperCase() &&
        resError !== resError.toLowerCase()
      ) {
        body.error = resError;
      }
      if (Object.keys(extra).length > 0) {
        Object.assign(body, extra);
      }
    }

    response.status(status).json(body);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'INVALID_TRANSITION',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return codes[status] ?? 'ERROR';
  }

  /**
   * Transforms class-validator messages like "email must be an email"
   * into { email: ["must be an email"] }.
   */
  private parseValidationErrors(
    messages: string[],
  ): Record<string, string[]> {
    const detail: Record<string, string[]> = {};
    for (const msg of messages) {
      // class-validator messages typically start with the property name
      const spaceIdx = msg.indexOf(' ');
      if (spaceIdx > 0) {
        const field = msg.substring(0, spaceIdx);
        const error = msg.substring(spaceIdx + 1);
        if (!detail[field]) {
          detail[field] = [];
        }
        detail[field].push(error);
      } else {
        if (!detail['_']) {
          detail['_'] = [];
        }
        detail['_'].push(msg);
      }
    }
    return detail;
  }
}
