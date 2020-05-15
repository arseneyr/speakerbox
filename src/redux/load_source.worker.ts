import localForage from "localforage";

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
  const crypto = self.crypto.subtle;
  const hash = btoa(
    String.fromCharCode(...new Uint8Array(await crypto.digest("SHA-1", buffer)))
  );
  localForage.setItem(hash, buffer);
  return hash;
}
