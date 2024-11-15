import type { Unwrap } from '@pulumi/pulumi';
import { setMocks } from '@pulumi/pulumi/runtime';
import axios from 'axios';
import { unitTestEc2Instance, unitTestSecurityGroupRule } from 'conventions/instance';
import { Stack, getProgramArgs } from 'lib';
import * as stackModule from '.';

const { name, envs, config, program } = stackModule;

describe(name, () => {
  describe('unit', () => {
    const env = envs[0];

    beforeAll(async () => {
      setMocks(
        {
          newResource: (args) => {
            let state: Record<string, any> = args.inputs;
            if (args.type === 'aws:ec2/securityGroupRule:SecurityGroupRule') {
              state = { ...state, ...unitTestSecurityGroupRule(args) };
            }
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

    it('stack inputs and outputs', async () => {
      const c = await config(env);
      expect(c.vpcId).toEqual(expect.any(String));
      expect(c.subnetId).toEqual(expect.any(String));
      expect(c.publicKey).toEqual(expect.any(String));
      expect(c.myIp).toEqual(expect.any(String));
      const outputs = await program(getProgramArgs(name, env), c);
      outputs.instance.publicIp.apply((v) => expect(v).toEqual(expect.any(String)));
    });
  });

  describe('integration', () => {
    type StackOutputs = Awaited<ReturnType<typeof program>>;
    let stack: Stack<StackOutputs>;
    let stackOutputs: Unwrap<StackOutputs>;

    beforeAll(async () => {
      const testConfig: () => ReturnType<typeof config> = async () => ({
        vpcId: 'vpc-0d1dcd570bf13220d',
        subnetId: 'subnet-0eea55807ccc40161',
        publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEC30Zr2DsR3fRJa0VInOLmBA5RoaNyzGgcS7la0cj0B',
        myIp: '125.130.178.156/32',
      });
      stack = await Stack.create(name, testConfig, program, envs[0]);
      await stack.up();
      stackOutputs = await stack.outputs();
    });

    afterAll(async () => {
      await stack.down();
    });

    it('outputs public ip', async () => {
      expect(stackOutputs.instance.publicIp).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });

    it('http response', async () => {
      const expected = `Hi, ${name}\n`;

      const MAX_RETRIES = 10;
      const RETRY_INTERVAL = 5000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`http response test attempt: ${attempt}/${MAX_RETRIES}`);
          const response = await axios.get(`http://${stackOutputs.instance.publicIp}`);
          expect(response.status).toEqual(200);
          expect(response.data).toEqual(expected);
          return;
        } catch (error) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
        }
      }

      throw new Error(`http response test failed after max retries: ${MAX_RETRIES}, interval: ${RETRY_INTERVAL}`);
    });
  });
});
