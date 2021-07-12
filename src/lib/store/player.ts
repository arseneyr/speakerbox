import audioContext from "$lib/audioContext";
import { lazySharedSwitch, ObservableQueue } from "$lib/utils";
import {
  BehaviorSubject,
  defer,
  merge,
  Observable,
  ObservableInput,
  of,
} from "rxjs";
import type { ConnectableObservableLike } from "rxjs/internal/observable/connectable";
import {
  distinctUntilChanged,
  map,
  share,
  startWith,
  switchAll,
} from "rxjs/operators";

export interface Player {
  play(): void;
  stop(): void;
  playing: Observable<boolean>;
  duration: number;
}

function createDecodedPlayer(decoded: AudioBuffer): Observable<Player> {
  return defer(() => {
    let source: AudioBufferSourceNode;
    const playing = new BehaviorSubject(false);

    return of({
      play: () => {
        if (source) {
          source.onended = undefined;
          source.stop();
        }
        source = audioContext.createBufferSource();
        source.buffer = decoded;
        source.connect(audioContext.destination);
        source.onended = () => playing.next(false);
        playing.next(true);
        source.start();
      },
      stop: () => {
        playing.next(false);
        source?.stop();
      },
      duration: decoded.duration,
      playing,
    });
  });
}

function createEncodedPlayer(encoded: ArrayBuffer): Observable<Player> {
  return new Observable((subscriber) => {
    const playing = new BehaviorSubject(false);
    const audio = new Audio(URL.createObjectURL(new Blob([encoded])));
    audio.onpause = () => playing.next(false);
    audio.oncanplaythrough = () => {
      audio.oncanplaythrough = undefined;
      subscriber.next({
        play: () => {
          playing.next(true);
          audio.currentTime = 0;
          audio.play();
        },
        stop() {
          audio.pause();
          audio.currentTime = 0;
        },
        duration: audio.duration,
        playing,
      });
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

const encodedPlayerQueue = new ObservableQueue();

export function playerGenerator(
  encodedSources$: Observable<ObservableInput<ArrayBuffer>>,
  decodedSources$: Observable<AudioBuffer>
): ConnectableObservableLike<Player | null> {
  const cancelPlayerCreate$ = merge(decodedSources$, encodedSources$);

  const encodedPlayers$ = encodedSources$.pipe(
    switchAll(),
    map((buf) =>
      encodedPlayerQueue
        .add(createEncodedPlayer(buf), cancelPlayerCreate$)
        .pipe(startWith(null))
    )
  );

  const decodedPlayers$ = decodedSources$.pipe(map(createDecodedPlayer));
  return lazySharedSwitch(() => new BehaviorSubject(null))(
    merge(encodedPlayers$, decodedPlayers$)
  );
}
