import type { Workerized } from "workerize-loader?*";
import { Deferred, Unpromisify } from "../globalTypes";
import Debug from "debug";
import * as LSW from "./load_source.worker";

const debug = Debug("worker");

type T = FunctionNames<Workerized<typeof LSW>>;

// class WorkerPool<T> {
//   private readonly idleWorkers: Workerized<T>[];
//   private readonly workBacklog: WorkUnit<T, FunctionNames<T>>[] = [];
//   constructor(
//     workerGenerator: () => Workerized<T>,
//     private readonly maxWorkers: number = (navigator.hardwareConcurrency ?? 2) -
//       1
//   ) {
//     this.idleWorkers = Array.from({ length: maxWorkers }, workerGenerator);
//   }

//   public queueWork<F extends FunctionNames<T>>(
//     func: F,
//     ...params: Parameters<T[F]>
//   ) {
//     const workUnit = {
//       func,
//       params,
//       deferred: new Deferred<Unpromisify<ReturnType<T[F]>>>(),
//     };
//     if (this.idleWorkers.length) {
//       const worker = this.idleWorkers.pop()!;
//       this.doWork(worker, workUnit);
//     } else {
//       this.workBacklog.push(workUnit);
//     }

//     return workUnit.deferred.promise;
//   }

//   private async doWork<F extends FunctionNames<T>>(
//     worker: Workerized<T>,
//     workUnit: WorkUnit<T, F>
//   ) {
//     worker[workUnit.func](workUnit.params)
//       .then((ret) => {
//         workUnit.deferred.resolve(ret);
//         const work = this.workBacklog.shift();
//         work ? this.doWork(worker, work) : this.idleWorkers.push(worker);
//       })
//       .catch((err) => {
//         workUnit.deferred.reject(err);
//         const work = this.workBacklog.shift();
//         work ? this.doWork(worker, work) : this.idleWorkers.push(worker);
//       });
//   }
// }

// export default WorkerPool;

export type AsyncOnly<T> = {
  [K in keyof T]: T[K] extends (...params: any) => PromiseLike<any>
    ? T[K]
    : never;
};

type FunctionNames<T> = {
  [K in keyof T]: T[K] extends (...params: any) => PromiseLike<any> ? K : never;
}[keyof T];

type FF = FunctionNames<typeof LSW>;

// type FunctionNames<T> = {
//   [K in keyof T]: T[K] extends (...params: any[]) => PromiseLike<any>
//     ? K
//     : never;
// }[keyof T];

type WorkUnit<T, F extends FunctionNames<T>> = {
  prop: F;
  params: Parameters<T[F]>;
  deferred: Deferred<Unpromisify<ReturnType<T[F]>>>;
};

function createWorkerPool<T extends object>(
  workerGenerator: () => T,
  maxWorkersParam?: number
): T {
  let numWorkers = 1;
  const maxWorkers =
    maxWorkersParam ?? (navigator.hardwareConcurrency ?? 2) - 1;
  const idleWorkers = [workerGenerator()];
  const workBacklog: WorkUnit<T, FunctionNames<T>>[] = [];

  function doWork<F extends FunctionNames<T>>(
    worker: T,
    workUnit: WorkUnit<T, F>
  ) {
    worker[workUnit.prop](...workUnit.params)
      .then((ret: any) => {
        workUnit.deferred.resolve(ret);
        const work = workBacklog.shift();
        work ? doWork(worker, work) : idleWorkers.push(worker);
      })
      .catch((err: any) => {
        workUnit.deferred.reject(err);
        const work = workBacklog.shift();
        work ? doWork(worker, work) : idleWorkers.push(worker);
      });
  }

  return new Proxy(idleWorkers[0], {
    get<F extends FunctionNames<T>>(target: T, prop: F) {
      if (!target[prop]) {
        return target[prop];
      }
      return (...params: Parameters<T[F]>) => {
        const workUnit = {
          prop,
          params,
          deferred: new Deferred<Unpromisify<ReturnType<T[F]>>>(),
        };
        if (idleWorkers.length) {
          debug("had idle worker");
          doWork(idleWorkers.pop()!, workUnit);
        } else if (numWorkers < maxWorkers) {
          debug("creating new worker");
          numWorkers += 1;
          doWork(workerGenerator(), workUnit);
        } else {
          debug("queuing work");
          workBacklog.push(workUnit);
        }
        return workUnit.deferred.promise;
      };
    },
  });
}

export { createWorkerPool };
