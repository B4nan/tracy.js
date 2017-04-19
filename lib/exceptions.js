'use strict';

/**
 * @param {String} message
 * @param {Number} status
 * @param {Number} code
 * @constructor
 */
class LogicalException extends Error {

  /**
   * @param {String} [message]
   * @param {Number} [code]
   * @param {Object|Error} [data]
   * @param {Error} [previous]
   */
  constructor(message = '', code = 500, data = {}, previous = null) {
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

require('util').inherits(LogicalException, Error);

class DomainException extends LogicalException {}

class InvalidArgumentException extends LogicalException {
  /**
   * @param {String} [message]
   * @param {Number} [code]
   */
  constructor(message = '', code = 400) {
    super(message, code);
  }
}

class ValidationException extends InvalidArgumentException {

  /**
   * @param {String} [message]
   */
  constructor(message = '') {
    super(message, 400);
  }

}

class RangeException extends LogicalException {}

class RuntimeException extends LogicalException {}

class HttpException extends LogicalException {}

class BadRequestException extends LogicalException {

  /**
   * @param {String} [message]
   * @param {Number} [code]
   * @param {Object} [data]
   */
  constructor(message = '', code = 400, data = {}) {
    super(message, code, data);
  }

}

class NotFoundException extends LogicalException {
  /**
   * @param {String} [message]
   * @param {Object|Error} [data]
   * @param {Error} [previous]
   */
  constructor(message = '', data = {}, previous = null) {
    super(message, 404, data, previous);
  }
}

class ForbiddenRequestException extends LogicalException {

  /**
   * @param {String} [message]
   * @param {Number} [code]
   * @param {Object} [data]
   */
  constructor(message = '', code = 403, data = {}) {
    super(message, code, data);
  }

}

module.exports = {
  BadRequestException: BadRequestException,
  DomainException: DomainException,
  ForbiddenRequestException: ForbiddenRequestException,
  HttpException: HttpException,
  InvalidArgumentException: InvalidArgumentException,
  LogicalException: LogicalException,
  NotFoundException: NotFoundException,
  RangeException: RangeException,
  RuntimeException: RuntimeException,
  ValidationException: ValidationException,
};
