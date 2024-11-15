import type { Unwrap } from '@pulumi/pulumi';
import { LocalWorkspace, type OutputValue, type Stack as PulumiStack } from '@pulumi/pulumi/automation';

/**
 * process.stdout.write 함수를 직접 전달하면 아래 오류 발생하여 감싼 함수 사용
 * TypeError: Cannot read properties of undefined (reading '_writableState')
 */
export const onOutput = (out: string) => process.stdout.write(out);

/**
 * 스택 프로그램 인자 인터페이스
 */
export interface ProgramArgs {
  name: string;
  env: string;
  tags: Record<string, string>;
}

/**
 * 스택 이름과 환경을 기준으로 스택 프로그램 인자를 반환하는 함수
 */
export const getProgramArgs = <E extends string>(stack: string, env: E): ProgramArgs => {
  const noPrefixEnvs = ['common', 'sandbox'];
  const prefix = noPrefixEnvs.includes(env) ? '' : `${env}-`;
  const name = `${prefix}${stack}`;
  return { name, env, tags: { iac: 'pulumi', stack, env, Name: name } };
};

/**
 * 타입 추론 및 outputs 가공을 위해 Pulumi Automation Stack 클래스를 감싼 클래스
 */
export class Stack<O extends Record<string, any>> {
  private readonly opts = { color: 'always', onOutput } as const;

  constructor(private stack: PulumiStack) {}

  /**
   * Pulumi Automation API를 이용하여 스택을 구성하는 정적 팩토리 메서드
   * E: Environment
   * C: Config
   * O: Outputs
   * M: Module
   */
  static async create<E extends string, C extends Record<string, any>, O extends Record<string, any>>(
    name: string,
    config: (env: E) => Promise<C>,
    program: (args: ProgramArgs, config: C) => Promise<O>,
    env: E,
  ): Promise<Stack<O>> {
    const stack = await LocalWorkspace.createOrSelectStack(
      { projectName: name, stackName: env, program: async () => program(getProgramArgs(name, env), await config(env)) },
      { projectSettings: { name, runtime: 'nodejs' } },
    );
    // Inline Stack은 매번 재생성되는데 encryptedKey를 기본적으로 백엔드에서 로드하지 않아서 Config에서 Secret 사용 불가
    // 직접 가져와서 넣어주어서 해결. 관련 이슈: https://github.com/pulumi/pulumi/issues/7282
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    const encryptedKey = (await stack.exportStack()).deployment.secrets_providers!.state!.encryptedkey;
    console.log(encryptedKey);
    await stack.workspace.saveStackSettings(env, { encryptedKey });
    await stack.setAllConfig({ 'aws:region': { value: 'ap-northeast-2' } });
    return new Stack(stack);
  }

  async refresh() {
    return this.stack.refresh(this.opts);
  }

  async preview() {
    return this.stack.preview({ ...this.opts, diff: true });
  }

  async up() {
    return this.stack.up(this.opts);
  }

  async down() {
    return this.stack.destroy(this.opts);
  }

  /**
   * Pulumi outputs 결과에서 value를 뽑아서 Unwrap된 program의 반환 형식으로 반환
   */
  async outputs(): Promise<Unwrap<O>> {
    return Object.entries(await this.stack.outputs()).reduce(
      (acc, [k, v]) => {
        acc[k] = v.value;
        return acc;
      },
      {} as Record<string, OutputValue>,
    ) as Unwrap<O>;
  }
}
