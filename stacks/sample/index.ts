import * as aws from '@pulumi/aws';
import { getProvider } from 'components/provider';
import type { ProgramArgs } from 'lib';

type Env = (typeof envs)[number];
type Config = Awaited<ReturnType<typeof config>>;

export { name } from './project.json';

export const envs = ['common'] as const;

export const config = async (_: Env) => {
  return {
    vpcId: 'vpc-0d1dcd570bf13220d',
    subnetId: 'subnet-0eea55807ccc40161',
    publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEC30Zr2DsR3fRJa0VInOLmBA5RoaNyzGgcS7la0cj0B',
    myIp: '125.130.178.156/32',
  };
};

export const program = async ({ name, tags }: ProgramArgs, { vpcId, subnetId, publicKey, myIp }: Config) => {
  const provider = getProvider();

  const key = new aws.ec2.KeyPair(name, { keyNamePrefix: `${name}-`, publicKey, tags }, { provider });

  const sg = new aws.ec2.SecurityGroup(name, { namePrefix: `${name}-`, vpcId, tags }, { provider });
  new aws.ec2.SecurityGroupRule(
    `${name}-egress`,
    {
      securityGroupId: sg.id,
      type: 'egress',
      description: 'to anywhere',
      cidrBlocks: ['0.0.0.0/0'],
      ipv6CidrBlocks: ['::/0'],
      protocol: '-1',
      fromPort: 0,
      toPort: 0,
    },
    { provider },
  );
  new aws.ec2.SecurityGroupRule(
    `${name}-ingress`,
    {
      securityGroupId: sg.id,
      type: 'ingress',
      description: 'from my ip',
      cidrBlocks: [myIp],
      protocol: 'tcp',
      fromPort: 80,
      toPort: 80,
    },
    { provider },
  );

  const ami = await aws.ec2.getAmi(
    {
      mostRecent: true,
      owners: ['amazon'],
      filters: [
        { name: 'architecture', values: ['arm64'] },
        { name: 'name', values: ['amzn2-ami-kernel-5.10-*'] },
      ],
    },
    { provider },
  );

  const instance = new aws.ec2.Instance(
    `${name}-instance`,
    {
      subnetId,
      ami: ami.id,
      vpcSecurityGroupIds: [sg.id],
      keyName: key.keyName,
      instanceType: 't4g.nano',
      associatePublicIpAddress: true,
      userData: `#!/bin/bash
sudo yum install -y httpd
sudo systemctl start httpd
echo 'Hi, ${name}' > /var/www/html/index.html`,
      tags,
    },
    { provider },
  );

  return { instance: { publicIp: instance.publicIp } };
};
