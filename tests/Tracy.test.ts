process.env.NODE_ENV = '';

import { Tracy } from '../lib';
import * as exceptions from '../lib/exceptions';

describe('tracy.js', () => {
  const tracy = new Tracy();

  describe('error handling', () => {
    test('should be disabled be default', () => {
      expect(tracy.isEnabled()).toEqual(false);
      tracy.enable();
      expect(tracy.isEnabled()).toEqual(true);
    });

    test('should have static `enable` helper factory', () => {
      expect(Tracy.enable).toBeInstanceOf(Function);
      const t = Tracy.enable();
      expect(t).toBeInstanceOf(Tracy);
      expect(t.isEnabled()).toEqual(true);
    });

    test('should return current NODE_ENV', () => {
      expect(tracy.getEnvironment()).toBe('development');

      tracy.environment = 'development';
      expect(tracy.getEnvironment()).toBe('development');

      tracy.environment = 'test';
      expect(tracy.getEnvironment()).toBe('test');

      tracy.environment = 'production';
      expect(tracy.getEnvironment()).toBe('production');

      tracy.environment = 'test';
    });

    test('should display JSON error to API request', () => {
      tracy.environment = 'production';
      tracy.enable({ logger: () => {} } as any);
      const cb = (...params: any[]) => { throw new exceptions.LogicalException('test'); };
      const cb2 = (...params: any[]) => { throw new exceptions.LogicalException(); };
      const cb3 = (...params: any[]) => { throw { message: 'test', errorCode: 123 }; };
      const tracyCb = tracy.catcher(cb);
      const tracyCb2 = tracy.catcher(cb2);
      const tracyCb3 = tracy.catcher(cb3);

      const req = {headers: {}};
      const res = {
        status: jest.fn(),
        json: jest.fn(),
        end: jest.fn(),
      };
      const next = jest.fn();

      expect(() => cb(req, res, next)).toThrow();
      expect(() => cb2(req, res, next)).toThrow();
      expect(() => cb3(req, res, next)).toThrow();
      expect(() => tracyCb(req, res, next)).not.toThrow();
      expect(() => tracyCb2(req, res, next)).not.toThrow();
      expect(() => tracyCb3(req, res, next)).not.toThrow();
      tracy.environment = 'test';
    });

    test('should display HTML error to browser request', () => {
      tracy.enable({ logger: () => {} } as any);
      const cb = (...params: any[]) => {
        throw new exceptions.LogicalException('test', 400, {code: 123}, new Error('PREVIOUS_ERROR'));
      };
      const cb2 = (...params: any[]) => {
        throw new exceptions.LogicalException('test', 400, {code: 123});
      };
      const cb3 = (...params: any[]) => {
        throw { message: 'test', errorCode: 123 };
      };
      const tracyCb = tracy.catcher(cb);
      const tracyCb2 = tracy.catcher(cb2);
      const tracyCb3 = tracy.catcher(cb3);

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
      expect(() => cb2(req, res, next)).toThrow();
      expect(() => cb3(req, res, next)).toThrow();
      expect(() => tracyCb(req, res, next)).not.toThrow();
      expect(() => tracyCb2(req, res, next)).not.toThrow();
      expect(() => tracyCb3(req, res, next)).not.toThrow();
    });
  });

  describe('exceptions', () => {
    test('should provide exceptions', () => {
      expect(typeof tracy.exceptions).toBe('object');
      expect(Object.keys(tracy.exceptions)).toEqual([
        'LogicalException',
        'DomainException',
        'InvalidArgumentException',
        'ValidationException',
        'RangeException',
        'RuntimeException',
        'HttpException',
        'BadRequestException',
        'NotFoundException',
        'ForbiddenRequestException',
      ]);
    });

    test('should create BadRequestException', () => {
      const e = new tracy.exceptions.BadRequestException('NOT_FOUND', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.BadRequestException);
      expect(new tracy.exceptions.BadRequestException()).toBeInstanceOf(exceptions.BadRequestException);
    });

    test('should create DomainException', () => {
      const e = new tracy.exceptions.DomainException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.DomainException);
      expect(new tracy.exceptions.DomainException()).toBeInstanceOf(exceptions.DomainException);
    });

    test('should create ForbiddenRequestException', () => {
      const e = new tracy.exceptions.ForbiddenRequestException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.ForbiddenRequestException);
      expect(new tracy.exceptions.ForbiddenRequestException()).toBeInstanceOf(exceptions.ForbiddenRequestException);
    });

    test('should create InvalidArgumentException', () => {
      const e = new tracy.exceptions.InvalidArgumentException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.InvalidArgumentException);
      expect(new tracy.exceptions.InvalidArgumentException()).toBeInstanceOf(exceptions.InvalidArgumentException);
    });

    test('should create LogicalException', () => {
      const e = new tracy.exceptions.LogicalException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.LogicalException);
      expect(new tracy.exceptions.LogicalException()).toBeInstanceOf(exceptions.LogicalException);
      expect(new tracy.exceptions.LogicalException('msg', 501, new Error('lol'))).toBeInstanceOf(exceptions.LogicalException);
    });

    test('should create NotFoundException', () => {
      const e = new tracy.exceptions.NotFoundException('ERR_MSG', 408);
      expect(e).toBeInstanceOf(exceptions.NotFoundException);
      expect(new tracy.exceptions.NotFoundException()).toBeInstanceOf(exceptions.NotFoundException);
    });

    test('should create RangeException', () => {
      const e = new tracy.exceptions.RangeException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.RangeException);
      expect(new tracy.exceptions.RangeException()).toBeInstanceOf(exceptions.RangeException);
    });

    test('should create RuntimeException', () => {
      const e = new tracy.exceptions.RuntimeException('ERR_MSG', 408, {a: 1, b: 2});
      expect(e).toBeInstanceOf(exceptions.RuntimeException);
      expect(new tracy.exceptions.RuntimeException()).toBeInstanceOf(exceptions.RuntimeException);
    });

    test('should create ValidationException', () => {
      const e = new tracy.exceptions.ValidationException('ERR_MSG');
      expect(e).toBeInstanceOf(exceptions.ValidationException);
      expect(new tracy.exceptions.ValidationException()).toBeInstanceOf(exceptions.ValidationException);
    });
  });
});
