'use strict';

process.env.NODE_ENV = '';
const tracy = require('../lib/Tracy');

test('enabled/disabled', () => {
  expect(tracy.isEnabled()).toEqual(false);
  tracy.enable();
  expect(tracy.isEnabled()).toEqual(true);
});

test('environment getter', () => {
  expect(tracy.getEnvironment()).toBe('development');

  tracy.environment = 'development';
  expect(tracy.getEnvironment()).toBe('development');

  tracy.environment = 'test';
  expect(tracy.getEnvironment()).toBe('test');

  tracy.environment = 'production';
  expect(tracy.getEnvironment()).toBe('production');
});
