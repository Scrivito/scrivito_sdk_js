export function mozSetImageElement(
  imageElementId: string,
  canvas: HTMLCanvasElement
): void {
  if (!hasMozSetImageElement()) {
    throw new Error('Browser does not support mozSetImageElement!');
  }
  documentMozSetImageElement()(imageElementId, canvas);
}

export function clearMozSetImageElement(imageElementId: string): void {
  if (!hasMozSetImageElement()) {
    throw new Error('Browser does not support mozSetImageElement!');
  }
  documentMozSetImageElement()(imageElementId, null);
}

export function hasMozSetImageElement(): boolean {
  return !!documentMozSetImageElement();
}

// For test purpose only
export function documentMozSetImageElement() {
  return (
    (document as MozSetImageElement).mozSetImageElement &&
    (document as MozSetImageElement).mozSetImageElement.bind(document)
  );
}

interface MozSetImageElement extends Document {
  mozSetImageElement(
    imageElementId: string,
    canvas: HTMLCanvasElement | null
  ): void;
}
