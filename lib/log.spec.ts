import { createLogger, logTemplate } from './log';

describe('log', () => {
  it('use info level by default', () => {
    process.env = {};
    const logger = createLogger();
    expect(logger.level).toEqual('info');
  });

  it('use LOG_LEVEL env', () => {
    process.env = { LOG_LEVEL: 'warning' };
    const logger = createLogger();
    expect(logger.level).toEqual('warning');
  });

  it('use level parameter', () => {
    const logger = createLogger('error');
    expect(logger.level).toEqual('error');
  });

  it('use level parameter', () => {
    const logger = createLogger('error');
    expect(logger.level).toEqual('error');
  });

  it('use template', () => {
    expect(logTemplate({ timestamp: 'timestamp', level: 'level', message: 'message' })).toEqual(
      'timestamp [level] message',
    );
  });
});
