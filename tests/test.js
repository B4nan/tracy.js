'use strict';

process.env.NODE_ENV = '';
const tracy = require('../lib/Tracy');
const exceptions = require('../lib/exceptions');

describe('tracy.js', () => {
  describe('error handling', () => {
    it('should be disabled be default', () => {
      expect(tracy.isEnabled()).toEqual(false);
      tracy.enable();
      expect(tracy.isEnabled()).toEqual(true);
    });

    it('should return current NODE_ENV', () => {
      expect(tracy.getEnvironment()).toBe('development');

      tracy.environment = 'development';
      expect(tracy.getEnvironment()).toBe('development');

      tracy.environment = 'test';
      expect(tracy.getEnvironment()).toBe('test');

      tracy.environment = 'production';
      expect(tracy.getEnvironment()).toBe('production');

      tracy.environment = 'test';
    });

    it('should display JSON error to API request', () => {
      tracy.environment = 'production';
      tracy.enable();
      const cb = () => {throw new exceptions.LogicalException('test');};
      const tracyCb = tracy.catcher(cb);

      const req = {headers: {}};
      const res = {
        status: jest.fn(),
        json: jest.fn(),
        end: jest.fn(),
      };
      const next = jest.fn();

      expect(() => cb(req, res, next)).toThrow();
      expect(() => tracyCb(req, res, next)).not.toThrow();
      tracy.environment = 'test';
    });

    it('should display HTML error to browser request', () => {
      tracy.enable();
      tracy.enableHtmlResponse();
      const cb = () => {throw new exceptions.LogicalException('test', 400, {code: 123}, new Error('PREVIOUS_ERROR'));};
      const tracyCb = tracy.catcher(cb);

      const req = {
        headers: {'user-agent': 'webkit'},
        route: {test: 'route value'},
        params: {param1: 'value1', param2: 123},
      };
      const res = {
        status: jest.fn(),
        json: jest.fn(),
        end: jest.fn(),
      };
      const next = jest.fn();

      expect(() => cb(req, res, next)).toThrow();
      expect(() => tracyCb(req, res, next)).not.toThrow();
    });
  });

  describe('exceptions', () => {
    it('should provide exceptions', () => {
      expect(tracy.exceptions).toBeInstanceOf(Object);
      expect(Object.keys(tracy.exceptions)).toEqual([
        'BadRequestException',
        'DomainException',
        'ForbiddenRequestException',
        'HttpException',
        'InvalidArgumentException',
        'LogicalException',
        'NotFoundException',
        'RangeException',
        'RuntimeException',
        'ValidationException',
      ]);
    });

    it('should create BadRequestException', () => {
      const e = new tracy.exceptions.BadRequestException('NOT_FOUND', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.BadRequestException);
      expect(new tracy.exceptions.BadRequestException()).toBeInstanceOf(exceptions.BadRequestException);
    });

    it('should create DomainException', () => {
      const e = new tracy.exceptions.DomainException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.DomainException);
      expect(new tracy.exceptions.DomainException()).toBeInstanceOf(exceptions.DomainException);
    });

    it('should create ForbiddenRequestException', () => {
      const e = new tracy.exceptions.ForbiddenRequestException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.ForbiddenRequestException);
      expect(new tracy.exceptions.ForbiddenRequestException()).toBeInstanceOf(exceptions.ForbiddenRequestException);
    });

    it('should create InvalidArgumentException', () => {
      const e = new tracy.exceptions.InvalidArgumentException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.InvalidArgumentException);
      expect(new tracy.exceptions.InvalidArgumentException()).toBeInstanceOf(exceptions.InvalidArgumentException);
    });

    it('should create LogicalException', () => {
      const e = new tracy.exceptions.LogicalException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.LogicalException);
      expect(new tracy.exceptions.LogicalException()).toBeInstanceOf(exceptions.LogicalException);
      expect(new tracy.exceptions.LogicalException('msg', 501, new Error('lol'))).toBeInstanceOf(exceptions.LogicalException);
    });

    it('should create NotFoundException', () => {
      const e = new tracy.exceptions.NotFoundException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.NotFoundException);
      expect(new tracy.exceptions.NotFoundException()).toBeInstanceOf(exceptions.NotFoundException);
    });

    it('should create RangeException', () => {
      const e = new tracy.exceptions.RangeException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.RangeException);
      expect(new tracy.exceptions.RangeException()).toBeInstanceOf(exceptions.RangeException);
    });

    it('should create RuntimeException', () => {
      const e = new tracy.exceptions.RuntimeException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.RuntimeException);
      expect(new tracy.exceptions.RuntimeException()).toBeInstanceOf(exceptions.RuntimeException);
    });

    it('should create ValidationException', () => {
      const e = new tracy.exceptions.ValidationException('ERR_MSG');
      expect(e).toBeInstanceOf(exceptions.ValidationException);
      expect(new tracy.exceptions.ValidationException()).toBeInstanceOf(exceptions.ValidationException);
    });
  });
});
