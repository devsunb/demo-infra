import { parseArgs } from 'node:util';
import { logger } from './log';
import { type ProgramArgs, Stack } from './stack';

const commands = ['preview', 'up', 'down'] as const;
type Command = (typeof commands)[number];
const isCommand = (command: string): command is Command => commands.includes(command as Command);

/**
 * 스택을 실행하는 함수
 */
export async function start() {
  const args = parseArgs({
    allowPositionals: true,
    options: { refresh: { type: 'boolean', short: 'r' } },
  });

  if (args.positionals.length === 0) {
    return logger.error('스택 이름 인자는 필수입니다.');
  }

  const [stackPath, env, command] = args.positionals;
  const { name, envs, config, program } = (await import(stackPath)) as {
    name: string;
    envs: string[];
    config: (env: string) => Promise<any>;
    program: (args: ProgramArgs, config: any) => Promise<any>;
  };

  const usage = () => {
    logger.error(`Usage: nx start ${name} <${envs.join('|')}> <${commands.join('|')}> [options]
  options:
    -r, --refresh: Command 실행 전 Pulumi Refresh`);
  };
  if (!envs.includes(env)) {
    logger.error(`유효하지 않은 env: ${env}`);
    return usage();
  }
  if (!isCommand(command)) {
    logger.error(`유효하지 않은 command: ${command}`);
    return usage();
  }

  let stack: Stack<any>;
  try {
    stack = await Stack.create(name, config, program, env);
  } catch (e) {
    let errorMessage: string;
    if (e instanceof Error) errorMessage = e.message;
    else errorMessage = JSON.stringify(e);
    return logger.error(`스택 구성에 실패했습니다. Pulumi State 접근 권한이 있는지 확인하세요. (${errorMessage})`);
  }
  try {
    if (args.values.refresh) {
      logger.info('refresh stack');
      await stack.refresh();
    }
    logger.info(`${command} stack`);
    // if (command === 'up' || command === 'down') await slack(name, stackPath, env, command);

    return await stack[command]();
  } catch (e) {
    let errorMessage: string;
    if (e instanceof Error) errorMessage = e.message;
    else errorMessage = JSON.stringify(e);
    return logger.error(`스택 실행에 실패했습니다. Pulumi 로그를 확인하세요. (${errorMessage})`);
  }
}
