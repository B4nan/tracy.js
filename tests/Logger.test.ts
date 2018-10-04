import { Logger, LogicalException } from '../lib';

describe('Logger', () => {

  test('test log shortcuts', () => {
    const logger = new Logger({ level: 'silly', timestamp: true, silent: true });
    logger.info('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.debug('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.verbose('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.silly('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.warn('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.error('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.error(new LogicalException('msg', 500, new Error('orig')));
  });

  test('test without timestamp', () => {
    const logger = new Logger({ level: 'silly', silent: true });
    logger.info('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.debug('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.verbose('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.silly('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.warn('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.error('1', 'a', { foo: 'bar' }, () => console.warn(1));
    logger.error(new LogicalException('msg', 500, new Error('orig')));
  });

  test('test custom levels', () => {
    const logger1 = new Logger({ level: 'verbose', levels: { verbose: 0, info: 1 }, timestamp: true });
    logger1.info('1', 'a', { foo: 'bar' }, () => console.warn(1));
    const logger2 = new Logger({ level: 'verbose', levels: { verbose: 0, info: 1 } });
    logger2.info('1', 'a', { foo: 'bar' }, () => console.warn(1));
  });

});
