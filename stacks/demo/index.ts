import * as aws from '@pulumi/aws';
import { getProvider } from 'components/provider';
import type { ProgramArgs } from 'lib';

type Env = (typeof envs)[number];
type Config = Awaited<ReturnType<typeof config>>;

export { name } from './project.json';

export const envs = ['common'] as const;

export const config = async (_: Env) => {
  return {};
};

export const program = async ({ name, tags }: ProgramArgs, _: Config) => {
  const provider = getProvider();

  return {};
};
