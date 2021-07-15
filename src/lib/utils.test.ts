import { defer, firstValueFrom, Observable, of, OperatorFunction } from "rxjs";
import { mergeAll, share } from "rxjs/operators";
import { TestScheduler } from "rxjs/testing";
import {
  lazySharedSwitch,
  DeferredReplaySubject,
  ObservableQueue,
  toggleEmit,
} from "./utils";

let testScheduler: TestScheduler;
beforeEach(() => {
  testScheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
});

describe("observable queue", () => {
  test("serial subscriptions", () => {
    testScheduler.run((helpers) => {
      const { cold, expectSubscriptions, expectObservable } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("-a---|");
      const e1 = "     -a---|";
      const o1subs = " ^----!----";
      const o2 = cold("     -b--|");
      const e2 = "     ------b--|";
      const o2subs = " -----^---!";

      const q1 = queue.add(o1);
      const q2 = queue.add(o2);

      expectObservable(q1).toBe(e1);
      expectObservable(q2).toBe(e2);
      expectSubscriptions(o1.subscriptions).toBe(o1subs);
      expectSubscriptions(o2.subscriptions).toBe(o2subs);
      expect;
    });
  });

  test("errors don't stop queue", () => {
    testScheduler.run((helpers) => {
      const { cold, expectSubscriptions, expectObservable } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("-a---#");
      const e1 = "     -a---#";
      const o1subs = " ^----!----";
      const o2 = cold("     -b--|");
      const e2 = "     ------b--|";
      const o2subs = " -----^---!";

      const q1 = queue.add(o1);
      const q2 = queue.add(o2);

      expectObservable(q1).toBe(e1);
      expectObservable(q2).toBe(e2);
      expectSubscriptions(o1.subscriptions).toBe(o1subs);
      expectSubscriptions(o2.subscriptions).toBe(o2subs);
    });
  });

  test("not subscribing to queued observable right away", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("   -ab--c----|");
      const q1subs = "    -----^-----";
      const q1expected = "-----(abc)|";

      const q1 = queue.add(o1);

      expectObservable(q1, q1subs).toBe(q1expected);
    });
  });

  test("emitting cancel before subscribing to queued observable", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("--a--b-c|");
      const o2 = cold("        -xy--z----|");
      const q2subs = " -------^-----";
      const q2e = "    -------|";

      const c2 = cold("---c");
      const c2e = "    ^--!";

      queue.add(o1);
      const q2 = queue.add(o2, c2);

      expectObservable(q2, q2subs).toBe(q2e);
      expectSubscriptions(c2.subscriptions).toBe(c2e);
    });
  });

  test("cancellation before starting", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("    --a--|");
      const o2 = cold("         --b--|");
      const e2 = "         --|";
      const o3 = cold("         -c--|");
      const e3 = "         ------c--|";
      const o3subs = "     -----^---!";
      const cancel = cold("--c");
      const cancelSubs = " ^-!";

      queue.add(o1);
      const q2 = queue.add(o2, cancel);
      const q3 = queue.add(o3);
      expectObservable(q2).toBe(e2);
      expectObservable(q3).toBe(e3);
      expectSubscriptions(o2.subscriptions).toBe("-");
      expectSubscriptions(o3.subscriptions).toBe(o3subs);
      expectSubscriptions(cancel.subscriptions).toBe(cancelSubs);
    });
  });

  test("cancellation after starting", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("    --a--|");
      const o2 = cold("         --b--|");
      const cancel = cold("--------q");
      const o2subs = "     -----^--!";
      const e2 = "         -------b|";
      const o3 = cold("            -c--|");
      const e3 = "         ---------c--|";
      const o3subs = "     --------^---!";

      queue.add(o1);
      const q2 = queue.add(o2, cancel);
      const q3 = queue.add(o3);
      expectObservable(q2).toBe(e2);
      expectObservable(q3).toBe(e3);
      expectSubscriptions(o2.subscriptions).toBe(o2subs);
      expectSubscriptions(o3.subscriptions).toBe(o3subs);
    });
  });

  test("cancellation after starting", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, expectSubscriptions } = helpers;
      const queue = new ObservableQueue();

      const o1 = cold("    --a--|");
      const o2 = cold("         --b--|");
      const cancel = cold("--------q");
      const o2subs = "     -----^--!";
      const e2 = "         -------b|";
      const o3 = cold("            -c--|");
      const e3 = "         ---------c--|";
      const o3subs = "     --------^---!";

      queue.add(o1);
      const q2 = queue.add(o2, cancel);
      const q3 = queue.add(o3);
      expectObservable(q2).toBe(e2);
      expectObservable(q3).toBe(e3);
      expectSubscriptions(o2.subscriptions).toBe(o2subs);
      expectSubscriptions(o3.subscriptions).toBe(o3subs);
    });
  });

  test("adding deferred promises to queue", async () => {
    const queue = new ObservableQueue();

    function createObservableFromPromise() {
      const ret: Observable<void> & { started?: true } = defer(() => {
        ret.started = true;
        return Promise.resolve();
      });
      return ret;
    }

    const first = createObservableFromPromise();
    const second = createObservableFromPromise();
    queue.add(first);
    await expect(firstValueFrom(first)).resolves.not.toThrow();
    expect(first.started).toBe(true);
    expect(second.started).toBeFalsy();
  });
});

describe("toggleEmit", () => {
  test("with elements during quiet period", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;

      const source = cold("  -a---b-c--d");
      const notifier = cold("-n--n----n---n");
      const expected = "     -a-------cd---";

      expectObservable(source.pipe(toggleEmit(notifier))).toBe(expected);
    });
  });
  test("without elements during quiet period", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;

      const source = cold("  -a--------d");
      const notifier = cold("-n--n----n---n");
      const expected = "     -a--------d---";

      expectObservable(source.pipe(toggleEmit(notifier))).toBe(expected);
    });
  });
});

describe("lazySharedSwitch", () => {
  test("doesnt subscribe until connect", () => {
    testScheduler.run((helpers) => {
      const { cold, expectSubscriptions } = helpers;

      const input = cold("--a---a--a", { a: cold("x--y---z") });

      lazySharedSwitch()(input);
      expectSubscriptions(input.subscriptions).toBe("-");
    });
  });
  test("inner observables do not get subscribed to when output unsubscribed", () => {
    testScheduler.run((helpers) => {
      const { cold, hot, expectObservable, expectSubscriptions } = helpers;

      const inner$ = "x--y---z";
      const a = cold(inner$);
      const b = cold(inner$);
      const c = cold(inner$);

      const input = hot("--a---b--c", { a, b, c });
      const expected = " -------x----y---z";
      const subs = "     -------^";

      const connected = lazySharedSwitch()(input);
      connected.connect();
      expectObservable(connected, subs).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe("-");
    });
  });
  test("multiple inner observables while ouput is unsubscribed overwrite each other", () => {
    testScheduler.run((helpers) => {
      const { cold, hot, expectObservable, expectSubscriptions } = helpers;

      const inner$ = "x--y---z";
      const a = cold(inner$);
      const b = cold(inner$);
      const c = cold(inner$);

      const input = hot("--a---b--c-", { a, b, c });
      const expected = " ---------x--y---z";
      const outputSub = "---------^";
      const bSubs = "    ---------(^!)";
      const cSubs = "    ---------^";

      const connected = lazySharedSwitch()(input);
      connected.connect();
      expectObservable(connected, outputSub).toBe(expected);
      expectSubscriptions(a.subscriptions).toBe("-");
      expectSubscriptions(b.subscriptions).toBe(bSubs);
      expectSubscriptions(c.subscriptions).toBe(cSubs);
    });
  });
  test("object reference", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable } = helpers;

      const obj = {};

      const outer$ = "--a---a--a";
      const input = cold(outer$, { a: defer(() => of(obj)) });
      const expected = "--a";

      const connected = lazySharedSwitch()(input);
      connected.connect();
      expectObservable(connected).toBe(expected, { a: obj });
    });
  });
});

describe("MemoizedInnerSubject", () => {
  test("inner observables normally get resubscribed", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, flush } = helpers;

      const inner = "-b";
      const innerMock = jest.fn(() => cold(inner));

      const input = cold("--a", { a: defer(innerMock) }).pipe(
        share(),
        mergeAll()
      );
      const expected = "  ---b";

      expectObservable(input).toBe(expected);
      expectObservable(input).toBe(expected);
      flush();

      expect(innerMock).toBeCalledTimes(2);
    });
  });
  test("MemoizeInnerSubject doesn't rerun inner observable", () => {
    testScheduler.run((helpers) => {
      const { cold, expectObservable, flush } = helpers;

      const inner = "-b";
      const innerMock = jest.fn(() => cold(inner));

      const subject = new DeferredReplaySubject();

      const input = cold("--a", { a: innerMock }).pipe(
        share({ connector: () => subject as any }) as OperatorFunction<
          typeof innerMock,
          string
        >,
        mergeAll()
      );
      const expected = "  ---b";

      expectObservable(input).toBe(expected);
      expectObservable(input).toBe(expected);
      flush();

      expect(innerMock).toBeCalledTimes(1);
    });
  });
});
