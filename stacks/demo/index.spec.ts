import type { Unwrap } from '@pulumi/pulumi';
import { setMocks } from '@pulumi/pulumi/runtime';
import { Stack, getProgramArgs } from 'lib';
import * as stackModule from '.';

const { name, envs, config, program } = stackModule;

function unitTestEc2Instance(args: { inputs: { instanceType: string } }) {
  if (args.inputs.instanceType !== 't4g.nano') {
    throw new Error(`instanceType must be t4g.nano but ${args.inputs.instanceType}`);
  }
  return { publicIp: '' };
}

describe(name, () => {
  describe('unit', () => {
    const env = envs[0];

    beforeAll(async () => {
      setMocks(
        {
          newResource: (args) => {
            let state: Record<string, any> = args.inputs;
            if (args.type === 'aws:ec2/instance:Instance') {
              state = { ...state, ...unitTestEc2Instance(args) };
            }
            return { id: args.name, state };
          },
          call: (args) => args.inputs,
        },
        name,
        env,
      );
    });

    it('stack inputs and outputs', async () => {});
  });

  // describe('integration', () => {
  //   type StackOutputs = Awaited<ReturnType<typeof program>>;
  //   let stack: Stack<StackOutputs>;
  //   let stackOutputs: Unwrap<StackOutputs>;
  //
  //   beforeAll(async () => {
  //     const testConfig: () => ReturnType<typeof config> = async () => ({});
  //     stack = await Stack.create(name, testConfig, program, envs[0]);
  //     await stack.up();
  //     stackOutputs = await stack.outputs();
  //   });
  //
  //   afterAll(async () => {
  //     await stack.down();
  //   });
  //
  //   it('', async () => {});
  // });
});
