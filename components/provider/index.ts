import * as aws from '@pulumi/aws';
import { getProject, getStack } from '@pulumi/pulumi';

const providers: Record<string, aws.Provider> = {};

/**
 * 기본 리전 외 다른 리전을 사용하기 위해 Provider를 생성할 필요가 있는 경우
 * 코드 전체에서 한 번만 생성하도록 아래 함수를 사용한다.
 * 통합 테스트 등 단일 실행에서 두 개 이상의 스택을 생성하는 경우를 대비해서 스택 이름과 환경을 키로 사용한다.
 */
interface ProviderArgs {
  region?: aws.Region;
  profile?: string;
}

export function getProvider({ region, profile }: ProviderArgs = { region: 'ap-northeast-2', profile: 'default' }) {
  if (!region) region = 'ap-northeast-2';
  if (!profile) profile = 'default';
  const name = `${profile}-${region}`;
  const key = `${getProject()}:${getStack()}:${name}`;
  if (!Object.keys(providers).includes(key))
    providers[key] = new aws.Provider(name, { region, profile }, { aliases: [{ name: region }] });
  return providers[key];
}
