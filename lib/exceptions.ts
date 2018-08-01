import { inherits } from 'util';

export class LogicalException extends Error {

  code: number;
  statusCode: number;
  data: any;
  previous: Error;

  constructor(message = '', code = 500, data = {} as any, previous: Error = null) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.message = message;
    this.statusCode = this.code = code;

    if (previous === null && data instanceof Error) {
      previous = data;
      data = {};
    }

    this.data = data;
    this.previous = previous;
  }

}

inherits(LogicalException, Error);

export class DomainException extends LogicalException { }

export class InvalidArgumentException extends LogicalException {

  constructor(message = '', code = 400) {
    super(message, code);
  }

}

export class ValidationException extends InvalidArgumentException {

  constructor(message = '') {
    super(message, 400);
  }

}

export class RangeException extends LogicalException { }

export class RuntimeException extends LogicalException { }

export class HttpException extends LogicalException { }

export class BadRequestException extends LogicalException {

  constructor(message = '', code = 400, data = {} as any) {
    super(message, code, data);
  }

}

export class NotFoundException extends LogicalException {

  constructor(message = '', data = {} as any | Error, previous: Error = null) {
    super(message, 404, data, previous);
  }

}

export class ForbiddenRequestException extends LogicalException {

  constructor(message = '', code = 403, data = {} as any) {
    super(message, code, data);
  }

}
