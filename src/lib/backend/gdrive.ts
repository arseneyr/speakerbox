import type { StorageBackend } from "$lib/types";
import { privateWritable } from "$lib/utils";
import type { Readable } from "svelte/store";
import { localForage } from ".";

declare global {
  interface Window {
    onGapiLoad?(): void;
  }
}

// export interface GDriveBackend extends StorageBackend, EventTarget {
//   isSignedIn: Readable<boolean>;
//   signIn(): void;
//   addEventListener(type: "newSamples", callback: () => void): void;
// }

function silentLogin() {
  return new Promise<GoogleApiOAuth2TokenObject>((res, rej) => {
    gapi.auth.authorize(
      {
        client_id: import.meta.env.VITE_GDRIVE_CLIENT_ID as string,
        scope: "https://www.googleapis.com/auth/drive.appdata",
        authuser: 0,
        immediate: true,
      },
      (response) => (response.error ? rej(response.error) : res(response))
    );
  });
}

async function initializeGapi(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!window.gapi) {
      window.onGapiLoad = resolve;
    } else {
      resolve();
    }
  });
  await new Promise<void>((resolve) =>
    gapi.load("client", () => {
      resolve(
        gapi.client.init({
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
          ],
        })
      );
    })
  );
}

export class GDriveBackend extends EventTarget implements StorageBackend {
  public readonly isSignedIn = privateWritable<boolean>(false);

  private readonly _local = localForage();

  public signIn() {
    gapi.auth.authorize(
      {
        client_id: import.meta.env.VITE_GDRIVE_CLIENT_ID as string,
        scope: "https://www.googleapis.com/auth/drive.appdata",
        authuser: 0,
      },
      (token) => !token.error && this.isSignedIn._set(true)
    );
  }

  public static async initialize() {
    await initializeGapi();
    const ret = new GDriveBackend();
    try {
      gapi.auth.setToken(await silentLogin());
      ret.isSignedIn._set(true);
    } catch (e) {
      if (e === "immediate_failed") {
        ret.isSignedIn._set(false);
      } else {
        throw e;
      }
    }
  }
}

// async function initialize(): Promise<GDriveBackend> {
//   const isSignedIn = privateWritable<boolean>(false);
//   await initializeGapi();
//   try {
//     gapi.auth.setToken(await silentLogin());
//     isSignedIn._set(true);
//   } catch (e) {
//     if (e === "immediate_failed") {
//       isSignedIn._set(false);
//     } else {
//       throw e;
//     }
//   }

//   return { ...localForage(), signIn, isSignedIn };
// }

export default GDriveBackend.initialize;
