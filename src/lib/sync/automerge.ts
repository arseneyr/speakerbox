import { assert } from "$lib/utils";
import type { ValueDiff } from "automerge";
import type { BinaryDocument, Doc, ListDiff, MapDiff, Patch } from "automerge";
import type { string } from "fp-ts";
import * as t from "io-ts";

declare module "automerge" {
  interface ListDiff {
    props: {
      [propName: string]: { [opId: string]: MapDiff | ListDiff | ValueDiff };
    };
  }
}
type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Mutable<U>[]
    : Mutable<T[P]>;
};

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

// interface ConflictRecord {
//   path: string[];
//   values: { setByNewDoc: boolean; value: any }[];
// }

// type ConflictMap = Record<string, ConflictMap | ConflictRecord>;
interface ConflictMap {
  [key: string]: ConflictMap | { actorId: string; value: any }[];
}

type ExtendedDoc<T> = Doc<T> & { _conflicts?: ConflictMap };

function getConflictPaths(
  diff: ListDiff | MapDiff,
  path: string[]
): string[][] {
  let ret: string[][] = [];
  if (!diff.props) {
    return ret;
  }
  for (const [propName, value] of Object.entries(diff.props)) {
    if (Object.keys(value).length > 1) {
      // conflict exists
      ret.push(path.concat(propName));
    } else {
      ret = ret.concat(
        ...Object.values(value)
          .filter(
            (innerVal): innerVal is ListDiff | MapDiff =>
              innerVal.type === "map" || innerVal.type === "list"
          )
          .map((innerVal) => getConflictPaths(innerVal, path.concat(propName)))
      );
    }
  }
  return ret;
}

function extractConflicts(
  doc: Doc<any>,
  diff: ListDiff | MapDiff
): ConflictMap | null {
  if (!diff.props) {
    return null;
  }

  let ret: ConflictMap | null = null;

  for (const [propName, propValue] of Object.entries(diff.props)) {
    if (Object.keys(propValue).length > 1) {
      ret = ret ?? {};
      ret[propName] = Object.entries(Automerge.getConflicts(doc, propName)).map(
        ([changeId, value]) => ({
          actorId: changeId.split("@", 2)[1],
          value,
        })
      );
      // ret[propName] = Object.entries(propValue)
      //   .filter((entry): entry is [string, ValueDiff] => {
      //     const valid = entry[1].type === "value";
      //     assert(valid, "merging conflicting nested maps/lists");
      //     return valid;
      //   })
      //   .map(([actor, diff]) => ({
      //     actorId: actor.split("@", 2)[1],
      //     value: diff.value,
      //   }));
    } else {
      const nestedDiffs = Object.values(propValue).filter(
        (nestedDiff): nestedDiff is ListDiff | MapDiff =>
          nestedDiff.type === "map" || nestedDiff.type === "list"
      );
      for (const nestedDiff of nestedDiffs) {
        const nestedConflict = extractConflicts(doc[propName], nestedDiff);
        if (nestedConflict) {
          ret = ret ?? {};
          ret[propName] = nestedConflict;
        }
      }
    }
  }
  return ret;
}

function patchCallback<T extends Record<string, unknown>>(
  patch: Patch,
  oldDoc: Doc<T>,
  newDoc: Doc<T>
) {
  // const conflicts: ConflictRecord[] = flattenDiff(patch.diffs, []).map(
  //   (conflictPath) => {
  //     const innerDocPath = conflictPath.slice(0, conflictPath.length - 1);
  //     const innerDoc = innerDocPath.reduce(
  //       (acc, cur) => acc[cur] as any,
  //       newDoc
  //     );

  //     return {
  //       path: conflictPath,
  //       values: Object.entries(
  //         Automerge.getConflicts(
  //           innerDoc,
  //           conflictPath[conflictPath.length - 1]
  //         )
  //       ).map(([editId, value]) => ({
  //         setByNewDoc: editId.split("@", 2)[1] === Automerge.getActorId(newDoc),
  //         value,
  //       })),
  //     };
  //   }
  // );

  const conflicts = extractConflicts(newDoc, patch.diffs);
  // const conflictPaths = getConflictPaths(patch.diffs, []);
  // if (conflictPaths.length) {
  //   const conflictMap: ConflictMap = {};
  //   for (const conflictPath of conflictPaths) {
  //     const pathHead = conflictPath.slice(0, conflictPath.length - 1);
  //     const lastPathEl = conflictPath[conflictPath.length - 1];
  //     let innermostObj = conflictMap;
  //     let innerDoc = newDoc;
  //     for (const pathEl of pathHead) {
  //       innermostObj[pathEl] = {};
  //       innermostObj = innermostObj[pathEl] as any;
  //       innerDoc = innerDoc[pathEl] as any;
  //     }
  //     innermostObj[lastPathEl] = Object.entries(
  //       Automerge.getConflicts(innerDoc, lastPathEl)
  //     ).map(([changeId, value]) => ({
  //       actorId: changeId.split("@", 2)[1],
  //       value,
  //     }));
  //   }
  conflicts &&
    Object.defineProperty(newDoc, "_conflicts", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: conflicts,
    });
  // }
}

function mergeableInit<T extends Record<string, unknown>>(
  state: T,
  actorId?: string
): ExtendedDoc<T> {
  return Automerge.from(state, {
    patchCallback: patchCallback as any,
    actorId,
  });
}

function mergeableClone<T>(doc: Doc<T>): Doc<T> {
  return Automerge.clone(doc, { patchCallback: patchCallback as any });
}

function mergeableChange<T extends Record<string, unknown>>(
  doc: Doc<T>,
  updateFn: (contents: Mutable<T>) => void
): Doc<T> {
  return Automerge.change(doc, updateFn);
}

function mergeableMerge<T>(first: Doc<T>, second: Doc<T>): ExtendedDoc<T> {
  return Automerge.merge(first, second);
}

export { mergeableInit, mergeableMerge, mergeableChange, mergeableClone };
