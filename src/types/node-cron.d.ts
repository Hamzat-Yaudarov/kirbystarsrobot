declare module 'node-cron' {
  export function schedule(
    cronExpression: string,
    func: () => void,
    options?: any
  ): any;
}
