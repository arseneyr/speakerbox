/// <reference types="react-scripts" />
declare module "wavesurfer.js/dist/plugin/wavesurfer.regions";
declare module "workerize-loader!*" {
  type AnyFunction = (...args: any[]) => any;
  type Async<F extends AnyFunction> = (
    ...args: Parameters<F>
  ) => Promise<ReturnType<F>>;

  type Workerized<T> = Worker &
    { [K in keyof T]: T[K] extends AnyFunction ? Async<T[K]> : never };

  function createInstance<T>(): Workerized<T>;
  export = createInstance;
}
declare module "@ungap/event-target" {
  export = EventTarget;
}
declare module "react-qr-code";
declare module "pleasejs";
declare module "worker-plugin/loader*" {
  const exportString: string;
  export default exportString;
}
declare module "!!file-loader*" {
  const exportString: string;
  export default exportString;
}
