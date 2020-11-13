import localForage from "localforage";
import { createOggEncoder, WasmMediaEncoder } from "wasm-media-encoders";
// import { createOggEncoder } from "../../../wasm-media-encoders/src";
import FileType from "file-type/browser";
import { v4 } from "uuid";

function pFileReader(file: Blob) {
  return new Promise<ArrayBuffer>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as ArrayBuffer);
    fr.onerror = () => rej(fr.error);
    fr.readAsArrayBuffer(file);
  });
}

export async function loadFile(file: Blob) {
  const buffer = await pFileReader(file);
  // eslint-disable-next-line no-restricted-globals
  const id = v4();
  // const crypto = self.crypto.subtle;
  // const hash = btoa(
  //   String.fromCharCode(...new Uint8Array(await crypto.digest("SHA-1", buffer)))
  // );
  // localForage.setItem(id, buffer);
  await localForage.setItem(id, buffer);
  return {
    id,
    mimeType: (await FileType.fromBuffer(buffer))?.mime,
    objectUrl: URL.createObjectURL(new Blob([buffer])),
  };
}

let encoderGlobal: WasmMediaEncoder<"audio/ogg"> | null = null;

export async function encode(
  id: string,
  buffer: {
    sampleRate: number;
    channelBuffers: Float32Array[];
  }
) {
  if (buffer.channelBuffers.length < 1 || buffer.channelBuffers.length > 2) {
    throw new Error("Invalid number of channels");
  }

  let outBuffer = new Uint8Array(1024 * 1024);
  const encoder = encoderGlobal ?? (encoderGlobal = await createOggEncoder());
  encoder.configure({
    channels: buffer.channelBuffers.length as 1 | 2,
    sampleRate: buffer.sampleRate,
    vbrQuality: 2,
  });
  let moreData = true;
  let offset = 0;
  while (true) {
    const result = moreData
      ? encoder.encode(buffer.channelBuffers)
      : encoder.finalize();
    if (result.byteLength > outBuffer.byteLength - offset) {
      const newBuffer = new Uint8Array(offset + result.byteLength);
      newBuffer.set(outBuffer);
      outBuffer = newBuffer;
    }
    outBuffer.set(result, offset);
    offset += result.byteLength;
    if (!moreData) {
      break;
    }
    moreData = false;
  }

  await localForage.setItem(id, outBuffer.buffer);
}
