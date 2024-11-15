export function unitTestSecurityGroupRule(args: { inputs: { type: string; fromPort: number; toPort: number } }) {
  if (args.inputs.type === 'ingress') {
    if (args.inputs.fromPort !== 80 || args.inputs.toPort !== 80) {
      throw new Error(
        `ingress security group rule only allowed port 80 but fromPort ${args.inputs.fromPort}, toPort ${args.inputs.toPort}`,
      );
    }
  }
  return {};
}

export function unitTestEc2Instance(args: { inputs: { instanceType: string } }) {
  if (args.inputs.instanceType !== 't4g.nano') {
    throw new Error(`instanceType must be t4g.nano but ${args.inputs.instanceType}`);
  }
  return { publicIp: '' };
}
