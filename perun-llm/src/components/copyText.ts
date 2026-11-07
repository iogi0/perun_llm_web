type ClipboardWriter = Pick<Clipboard, "writeText">;

// navigator.clipboard exists only in secure contexts, so it is undefined when
// the app is opened over plain http on a LAN address.
export async function copyText(
  text: string,
  clipboard: ClipboardWriter | undefined,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
