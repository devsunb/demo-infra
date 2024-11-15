import fs from 'node:fs';
import { faker } from '@faker-js/faker';
import { type Deployment, LocalWorkspace, type Stack as PulumiStack } from '@pulumi/pulumi/automation';
import { type DeepMockProxy, mock, mockDeep } from 'jest-mock-extended';
import { logger } from './log';
import { Stack, getProgramArgs, onOutput } from './stack';

describe('onOutput', () => {
  it('call process.stdout.write()', () => {
    const message = faker.string.sample();
    const write = jest.spyOn(process.stdout, 'write').mockImplementation();
    onOutput(message);
    expect(write).toHaveBeenCalledWith(message);
    write.mockRestore();
  });
});

describe('stack', () => {
  it('getProgramArgs', () => {
    expect(getProgramArgs('network', 'dev')).toEqual({
      env: 'dev',
      name: 'dev-network',
      tags: { iac: 'pulumi', stack: 'network', env: 'dev', Name: 'dev-network' },
    });
  });

  describe('with pulumi stack mock', () => {
    let info: jest.SpyInstance;
    let pulumiStack: DeepMockProxy<PulumiStack>;
    let createOrSelectStack: jest.SpyInstance;
    let writeFileSync: jest.SpyInstance;

    beforeAll(() => {
      info = jest.spyOn(logger, 'info').mockImplementation();
      pulumiStack = mockDeep<PulumiStack>();
      pulumiStack.outputs.mockResolvedValue({});
      const mockDeployment = mock<Deployment>();
      mockDeployment.deployment = { secrets_providers: { state: { encryptedkey: '' } } };
      pulumiStack.exportStack.mockResolvedValue(mockDeployment);
      createOrSelectStack = jest.spyOn(LocalWorkspace, 'createOrSelectStack').mockResolvedValue(pulumiStack);
      writeFileSync = jest.spyOn(fs, 'writeFileSync').mockReturnValue();
    });

    afterAll(() => {
      writeFileSync.mockRestore();
      createOrSelectStack.mockRestore();
      info.mockRestore();
    });

    it('refresh, preview, up, down', async () => {
      const stack = await Stack.create('network', jest.fn(), jest.fn(), 'dev');

      await stack.refresh();
      expect(pulumiStack.refresh).toHaveBeenCalled();

      await stack.preview();
      expect(pulumiStack.preview).toHaveBeenCalled();

      await stack.up();
      expect(pulumiStack.up).toHaveBeenCalled();

      await stack.down();
      expect(pulumiStack.destroy).toHaveBeenCalled();
    });
  });

  describe('with outputs mock', () => {
    // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
    const outputsMock = (o: Record<string, any> | void) =>
      Object.entries(o ?? {}).reduce(
        (acc, [k, v]) => {
          acc[k] = { value: v, secret: false };
          return acc;
        },
        {} as Record<string, any>,
      );

    let encryptedKey: string;
    let createOrSelectStack: jest.SpyInstance;

    beforeAll(() => {
      encryptedKey = faker.string.alphanumeric();
      createOrSelectStack = jest
        .spyOn(LocalWorkspace, 'createOrSelectStack')
        .mockImplementation(async ({ program }) => {
          const pulumiStack = mockDeep<PulumiStack>();
          const mockDeployment = mock<Deployment>();
          mockDeployment.deployment = { secrets_providers: { state: { encryptedkey: encryptedKey } } };
          pulumiStack.exportStack.mockResolvedValue(mockDeployment);
          pulumiStack.outputs.mockResolvedValue(outputsMock(await program()));
          return pulumiStack;
        });
    });

    afterAll(() => {
      createOrSelectStack.mockRestore();
    });

    it('create call createOrSelectStack', async () => {
      const name = faker.string.alphanumeric();
      const env = faker.string.alphanumeric();

      await Stack.create(name, jest.fn(), jest.fn(), env);
      expect(createOrSelectStack).toHaveBeenCalledWith(
        expect.objectContaining({ projectName: name, stackName: env }),
        expect.objectContaining({ projectSettings: expect.objectContaining({ name }) }),
      );
    });

    describe('args', () => {
      it('when env is dev', async () => {
        const name = 'asdf';
        const program = jest.fn();
        const env = 'dev';

        await Stack.create(name, jest.fn(), program, env);
        const expectedName = 'dev-asdf';
        const expectedTags = { iac: 'pulumi', stack: name, env: env, Name: expectedName };
        expect(program).toHaveBeenCalledWith({ env, name: expectedName, tags: expectedTags }, undefined);
      });

      it('when env is common', async () => {
        const name = 'network';
        const program = jest.fn();
        const env = 'common';

        await Stack.create(name, jest.fn(), program, env);
        const expectedTags = { iac: 'pulumi', stack: name, env: env, Name: name };
        expect(program).toHaveBeenCalledWith({ env, name, tags: expectedTags }, undefined);
      });

      it('when config is passed', async () => {
        const name = 'asdf';
        const testConfig = { test: { foo: 'bar' } };
        const config = jest.fn().mockResolvedValue(testConfig);
        const program = jest.fn();
        const env = 'test';

        await Stack.create(name, config, program, env);
        const expectedName = `${env}-${name}`;
        const expectedTags = { iac: 'pulumi', stack: name, env: env, Name: expectedName };
        expect(program).toHaveBeenCalledWith({ env, name: expectedName, tags: expectedTags }, testConfig);
      });
    });

    it('Stack outputs returns program result', async () => {
      const name = 'asdf-network';
      const testOutputs = { test1: 'test', test2: 1, test3: true };
      const program = jest.fn().mockResolvedValue(testOutputs);
      const env = 'dev';
      const stack = await Stack.create(name, jest.fn(), program, env);
      expect(await stack.outputs()).toEqual(testOutputs);
    });
  });
});
