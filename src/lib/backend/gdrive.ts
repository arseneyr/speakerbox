import type { IRemoteBackend, StorageBackend } from "$lib/types";
import { privateWritable } from "$lib/utils";
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
        client_id: import.meta.env.VITE_GDRIVE_CLIENT_ID,
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
    gapi.load("client:auth2", () => {
      resolve(
        gapi.client.init({
          clientId: import.meta.env.VITE_GDRIVE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/drive.appdata",
          discoveryDocs: [
            "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
          ],
        })
      );
    })
  );
  console.log(gapi.client.drive);
}

export class GDriveBackend extends EventTarget implements IRemoteBackend {
  public readonly signedInUser = privateWritable<string | false | null>(null);

  private readonly _local = localForage();

  constructor() {
    super();
    this._init();
  }

  private async _init() {
    await initializeGapi();
    console.log(gapi.auth2.getAuthInstance().isSignedIn.get());
    // try {
    //   gapi.auth.setToken(await silentLogin());
    //   this.signedInUser._set(true);
    // } catch (e) {
    //   if (e === "immediate_failed") {
    //     ret.isSignedIn._set(false);
    //   } else {
    //     throw e;
    //   }
    // }
  }

  public async getState() {}
  public async setState() {}
  public async deleteState() {}
  public async getSampleData() {
    return null;
  }
  public async setSampleData() {}
  public async deleteSample() {}

  public async signIn() {}
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

export default () => new GDriveBackend();
