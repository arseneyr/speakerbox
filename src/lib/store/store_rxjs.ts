import { BehaviorSubject, MonoTypeOperatorFunction, Observable } from "rxjs";
import { distinctUntilChanged, share, takeUntil } from "rxjs/operators";
import type { Writable } from "svelte/store";
import { v4 } from "uuid";

function rxWritable<T>(
  subject: BehaviorSubject<T>,
  transform?: MonoTypeOperatorFunction<T>
): Omit<Writable<T>, "update"> {
  const obs = transform ? subject.pipe(transform) : subject;
  return {
    subscribe: obs.subscribe.bind(obs),
    set: subject.next.bind(subject),
  };
}

interface Player {
  play(): void;
  stop(): void;
}

export class SampleStore {
  private readonly _playing$ = new BehaviorSubject(false);
  private readonly _loading$ = new BehaviorSubject(false);
  private readonly _encodedAudio$ = new BehaviorSubject<ArrayBuffer | null>(
    null
  );
  private readonly _decodedAudio$ = new BehaviorSubject<AudioBuffer | null>(
    null
  );
  private readonly _title$ = new BehaviorSubject<string | null>(null);
  private readonly _duration$ = new BehaviorSubject(null);

  public readonly playing = this._playing$.pipe(
    distinctUntilChanged(),
    share()
  );
  public readonly title = rxWritable(this._title$, distinctUntilChanged());
  public readonly duration = this._duration$.pipe(
    distinctUntilChanged(),
    share()
  );

  public readonly player: Observable<Player | null>;

  private constructor(public readonly id: string) {}

  private static _sampleMap = new Map<string, SampleStore>();
  private static _sampleMap$ = new BehaviorSubject(this._sampleMap);

  private static _addToSampleMap(store: SampleStore) {
    this._sampleMap.set(store.id, store);
    this._sampleMap$.next(this._sampleMap);
  }

  public static createNewSample(
    data: ArrayBuffer | Blob,
    title?: string
  ): SampleStore {
    const id = v4();
    const store = new SampleStore(id);
    store._title$.next(title ?? null);
    (data instanceof Blob ? data.arrayBuffer() : Promise.resolve(data)).then(
      (buf) => {
        store._encodedAudio$.next(buf);
      }
    );

    this._addToSampleMap(store);
    return store;
  }
  private _createEncodedPlayer(
    encoded: ArrayBuffer
  ): Observable<HTMLAudioElement> {
    return new Observable((subscriber) => {
      const audio = new Audio(URL.createObjectURL(new Blob([encoded])));
      audio.ondurationchange = () => this._duration$.next(audio.duration);
      audio.onpause = () => this._playing$.next(false);
      audio.oncanplaythrough = () => {
        audio.oncanplaythrough = undefined;
        subscriber.next(audio);
        subscriber.complete();
      };
      return () => {
        if (audio.oncanplaythrough) {
          audio.oncanplaythrough = undefined;
          audio.removeAttribute("src");
        }
      };
    });
  }
}
