import type { IRemoteBackend } from "$lib/types";
import gdrive from "./gdrive";
export { default as localForage } from "./localForage";
export { default as inMemory } from "./inMemory";
export { default as gDrive } from "./gdrive";

export default {
  gdrive: gdrive() as unknown as IRemoteBackend,
};
