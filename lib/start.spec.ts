import util from 'node:util';
import { faker } from '@faker-js/faker';
import { logger } from './log';
import { start } from './start';

const loadEnvSecrets = jest.fn();
const refresh = jest.fn();
const preview = jest.fn();
const up = jest.fn();
const down = jest.fn();
const init = jest.fn();
jest.mock('./stack', () => ({ Stack: { create: jest.fn(() => init()) } }));
jest.mock('stacks/instance', () => ({
  name: 'instance',
  envs: ['common'],
  config: jest.fn().mockResolvedValue({}),
  program: jest.fn(),
}));

describe('start', () => {
  let parseArgs: jest.SpyInstance;
  let info: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeAll(() => {
    parseArgs = jest.spyOn(util, 'parseArgs').mockImplementation();
    info = jest.spyOn(logger, 'info').mockImplementation();
    error = jest.spyOn(logger, 'error').mockImplementation();
  });

  afterAll(() => {
    parseArgs.mockRestore();
    info.mockRestore();
    error.mockRestore();
  });

  it('log error and exit when loadEnvSecrets reject', async () => {
    loadEnvSecrets.mockRejectedValue('');
    parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'preview'] });
    await start();
    expect(error).toHaveBeenCalledWith(expect.any(String));
    error.mockClear();
    loadEnvSecrets.mockReset();
  });

  it('log error and exit when init reject', async () => {
    const errorMessage = faker.string.sample();
    parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'preview'] });

    init.mockImplementation(() => {
      throw new Error(errorMessage);
    });
    await start();
    expect(error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
    error.mockClear();
    init.mockReset();

    init.mockImplementation(() => {
      throw errorMessage;
    });
    await start();
    expect(error).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(errorMessage)));
    error.mockClear();
    init.mockReset();
  });

  describe('when loadEnvSecrets, init resolve', () => {
    beforeAll(() => {
      loadEnvSecrets.mockResolvedValue(undefined);
      init.mockResolvedValue({ refresh, preview, up, down });
    });

    afterAll(() => {
      loadEnvSecrets.mockReset();
      init.mockReset();
    });

    it('reject when args are invalid', async () => {
      const expectedMessage = expect.stringContaining('Usage: nx start instance <common> <preview|up|down>');

      parseArgs.mockReturnValue({ values: {}, positionals: [] });
      await start();
      expect(error).toHaveBeenCalled();
      error.mockClear();

      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance'] });
      await start();
      expect(error).toHaveBeenCalledWith(expectedMessage);
      error.mockClear();

      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'invalid', 'preview'] });
      await start();
      expect(error).toHaveBeenCalledWith(expectedMessage);
      error.mockClear();

      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'invalid'] });
      await start();
      expect(error).toHaveBeenCalledWith(expectedMessage);
      error.mockClear();
    });

    it('log error and exit when cache error', async () => {
      const errorMessage = faker.string.sample();
      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'preview'] });

      preview.mockImplementation(() => {
        throw new Error(errorMessage);
      });
      await start();
      expect(error).toHaveBeenCalledWith(expect.stringContaining(errorMessage));
      error.mockClear();
      preview.mockReset();

      preview.mockImplementation(() => {
        throw errorMessage;
      });
      await start();
      expect(error).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(errorMessage)));
      error.mockClear();
      preview.mockReset();
    });

    it('refresh with flag', async () => {
      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'preview'] });
      await start();
      expect(refresh).toHaveBeenCalledTimes(0);

      parseArgs.mockReturnValue({
        values: { refresh: true },
        positionals: ['stacks/instance', 'common', 'preview'],
      });
      await start();
      expect(refresh).toHaveBeenCalledTimes(1);
      refresh.mockClear();
    });

    it('force load secrets with flag', async () => {
      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'preview'] });
      await start();
      expect(refresh).toHaveBeenCalledTimes(0);

      parseArgs.mockReturnValue({
        values: { refresh: true },
        positionals: ['stacks/instance', 'common', 'preview'],
      });
      await start();
      expect(refresh).toHaveBeenCalledTimes(1);
      refresh.mockClear();
    });

    it('up', async () => {
      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'up'] });
      await start();
      expect(up).toHaveBeenCalledTimes(1);
      up.mockClear();
    });

    it('down', async () => {
      parseArgs.mockReturnValue({ values: {}, positionals: ['stacks/instance', 'common', 'down'] });
      await start();
      expect(down).toHaveBeenCalledTimes(1);
      down.mockClear();
    });
  });
});
