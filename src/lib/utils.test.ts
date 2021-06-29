import { defer, firstValueFrom, Observable } from "rxjs";
import { TestScheduler } from "rxjs/testing";
import { ObservableQueue } from "./utils";

let testScheduler: TestScheduler;

beforeEach(() => {
  testScheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
});

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
