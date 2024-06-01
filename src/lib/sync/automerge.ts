import { assert, type Entries } from "$lib/utils";
import type { BinaryDocument, Doc } from "automerge";
import { CONFLICTS } from "automerge/frontend/constants";
import type { Brand } from "io-ts";

type DocWithConflicts<T> = {
  [CONFLICTS]?: {
    [K in keyof T]: {
      [changeId: string]: T[K] extends Record<string, any>
        ? DocWithConflicts<T[K]>
        : T[K];
    };
  };
};

type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Mutable<U>[]
    : Mutable<T[P]>;
};

type ConflictMap<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Brand<any>
    ? { actorId: string; value: T[K] }[]
    : T[K] extends Record<string, any>
    ? ConflictMap<T[K]>
    : { actorId: string; value: T[K] }[];
};

export type ExtendedDoc<T> = Doc<T> & {
  _actorId: string;
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

function mergeableGetConflicts<T>(
  doc: (Doc<T> | ExtendedDoc<T>) & DocWithConflicts<T>
): ConflictMap<T> | null {
  let ret: ConflictMap<T> | null = null;
  const conflicts = doc[CONFLICTS];
  if (!conflicts) {
    return null;
  }
  for (const [key, value] of Object.entries(conflicts) as Entries<
    typeof conflicts
  >) {
    const nestedKeys = Object.keys(value);
    if (nestedKeys.length > 1) {
      ret = ret ?? ({} as ConflictMap<T>);
      ret[key] = nestedKeys.map((k) => ({
        actorId: k.split("@", 2)[1],
        value: value[k],
      })) as any;
    } else {
      assert(nestedKeys.length === 1);
      const recurse = mergeableGetConflicts(value[nestedKeys[0]]);
      if (recurse) {
        ret = ret ?? ({} as ConflictMap<T>);
        ret[key] = recurse as any;
      }
    }
  }
  return ret;
}

function addActorId<T>(
  doc: Doc<T> | ExtendedDoc<T>,
  actorId?: string
): ExtendedDoc<T> {
  return Object.defineProperty(doc, "_actorId", {
    enumerable: false,
    configurable: false,
    writable: false,
    value:
      actorId ?? ("_actorId" in doc ? doc._actorId : Automerge.getActorId(doc)),
  }) as ExtendedDoc<T>;
}

function mergeableInit<T extends Record<string, unknown>>(
  state: T,
  actorId?: string
): ExtendedDoc<T> {
  return addActorId(Automerge.from(state, actorId), actorId);
}

function mergeableClone<T>(doc: Doc<T>, actorId?: string): ExtendedDoc<T> {
  return addActorId(Automerge.clone(doc, actorId), actorId);
}

function mergeableChange<T extends Record<string, unknown>>(
  doc: Doc<T>,
  updateFn: (contents: T) => void
): ExtendedDoc<T> {
  return addActorId(Automerge.change(doc, updateFn));
}

function mergeableMerge<T>(first: Doc<T>, second: Doc<T>): ExtendedDoc<T> {
  let doc = Automerge.merge(first, second);
  if (!mergeableHasChanged(first, doc)) {
    doc = first;
  }
  return addActorId(doc);
}

function mergeableHasChanged<T>(oldDoc: Doc<T>, newDoc: Doc<T>): boolean {
  return Automerge.getChanges(oldDoc, newDoc).length > 0;
}

function mergeableSave<T>(doc: Doc<T> | ExtendedDoc<T>): Uint8Array {
  const actorIdBuffer = new TextEncoder().encode(Automerge.getActorId(doc));
  const savedState = Automerge.save(doc);
  const outputBuffer = new Uint8Array(
    actorIdBuffer.length + 1 + savedState.length
  );
  outputBuffer.set(actorIdBuffer, 0);
  // Leave room for null byte
  outputBuffer.set(savedState, actorIdBuffer.length + 1);
  return outputBuffer;
}

function mergeableLoad<T>(data: Uint8Array): ExtendedDoc<T> {
  const actorIdSplitPoint = data.indexOf(0);
  if (actorIdSplitPoint < 0) {
    throw new Error("no actor id null byte found");
  }
  const actorId = new TextDecoder("utf-8", { fatal: true }).decode(
    data.subarray(0, actorIdSplitPoint)
  );
  return addActorId(
    Automerge.load<T>(
      data.subarray(actorIdSplitPoint + 1) as BinaryDocument,
      actorId
    ),
    actorId
  );
}

export {
  mergeableInit,
  mergeableMerge,
  mergeableChange,
  mergeableClone,
  mergeableLoad,
  mergeableSave,
  mergeableGetConflicts,
  mergeableHasChanged,
};
