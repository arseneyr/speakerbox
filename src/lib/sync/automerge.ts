import type { BinaryDocument, Doc, ListDiff, MapDiff, Patch } from "automerge";
import * as t from "io-ts";

declare module "automerge" {
  interface ListDiff {
    props: {
      [propName: string]: { [opId: string]: MapDiff | ListDiff | ValueDiff };
    };
  }
}

let Automerge: typeof import("automerge");

export async function loadAutomerge(): Promise<typeof Automerge> {
  if (Automerge) {
    return Automerge;
  }
  Automerge = (await import("automerge")).default;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (import.meta.env.DEV) {
    Automerge.init({ freeze: true });
  }
  return Automerge;
}

export const AutomergeCodec = <C extends t.Mixed>(base: C) =>
  new t.Type<Doc<t.TypeOf<C>>, Uint8Array, unknown>(
    "Automerge Doc",
    (input): input is Doc<t.TypeOf<C>> => base.is(input),
    (input, context) => {
      if (input instanceof Uint8Array) {
        try {
          return base.validate(
            Automerge.load(input as BinaryDocument),
            context
          );
        } catch {
          return t.failure(input, context);
        }
      }
      return t.failure(input, context);
    },
    (input) => Automerge.save(input)
  );

interface ConflictRecord {
  path: string[];
  values: { setByNewDoc: boolean; value: any }[];
}

type ExtendedDoc<T> = Doc<T> & { _conflicts?: ConflictRecord[] };

function flattenDiff(diff: ListDiff | MapDiff, path: string[]): string[][] {
  let ret: string[][] = [];
  for (const [propName, value] of Object.entries(diff.props)) {
    if (Object.keys(value).length > 1) {
      ret.push(path.concat(propName));
    } else {
      ret = ret.concat(
        ...Object.values(value)
          .filter(
            (innerVal): innerVal is ListDiff | MapDiff =>
              innerVal.type === "map" || innerVal.type === "list"
          )
          .map((innerVal) => flattenDiff(innerVal, path.concat(propName)))
      );
    }
  }
  return ret;
}

function patchCallback<T extends Record<string, unknown>>(
  patch: Patch,
  oldDoc: Doc<T>,
  newDoc: Doc<T>
) {
  const conflicts: ConflictRecord[] = flattenDiff(patch.diffs, []).map(
    (conflictPath) => {
      const innerDocPath = conflictPath.slice(0, conflictPath.length - 1);
      const innerDoc = innerDocPath.reduce(
        (acc, cur) => acc[cur] as any,
        newDoc
      );

      return {
        path: conflictPath,
        values: Object.entries(
          Automerge.getConflicts(
            innerDoc,
            conflictPath[conflictPath.length - 1]
          )
        ).map(([editId, value]) => ({
          setByNewDoc: editId.split("@", 2)[1] === Automerge.getActorId(newDoc),
          value,
        })),
      };
    }
  );

  conflicts.length &&
    Object.defineProperty(newDoc, "_conflicts", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: conflicts,
    });
}

function mergeableInit<T extends Record<string, unknown>>(
  state: T
): ExtendedDoc<T> {
  return Automerge.from(state, { patchCallback: patchCallback as any });
}

function mergeableMerge<T>(first: Doc<T>, second: Doc<T>): ExtendedDoc<T> {
  return Automerge.merge(first, second);
}

export { mergeableInit, mergeableMerge };
