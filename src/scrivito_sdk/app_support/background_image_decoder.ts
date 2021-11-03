import { decodeBackgroundImage } from 'scrivito_sdk/app_support/decode_background_image';
import { promiseAndFinally } from 'scrivito_sdk/common';

export class BackgroundImageDecoder {
  private readonly decodedUrls: {
    [imageUrl: string]: string | undefined;
  } = {};

  private readonly loadingRegistry: {
    [imageUrl: string]: Promise<void> | undefined;
  } = {};

  private readonly clears: Array<() => void> = [];
  private onUpdateCallback?: () => void;

  constructor(onUpdateCallback: () => void) {
    this.onUpdateCallback = onUpdateCallback;
  }

  getBackgroundImage(imageUrl: string): string | undefined {
    const resultUrl = this.decodedUrls[imageUrl];
    if (!resultUrl) {
      this.ensureLoading(imageUrl);
    }
    return resultUrl;
  }

  clear(): void {
    this.clears.map((clear) => clear());
    this.onUpdateCallback = undefined;
  }

  private ensureLoading(imageUrl: string) {
    if (this.decodedUrls[imageUrl] || this.loadingRegistry[imageUrl]) return;

    const promise = decodeBackgroundImage(imageUrl).then(
      ({ decodedBackgroundUrl, clear }) => {
        if (clear) this.clears.push(clear);

        this.decodedUrls[imageUrl] = decodedBackgroundUrl;

        this.onUpdateCallback && this.onUpdateCallback();
      }
    );
    this.loadingRegistry[imageUrl] = promiseAndFinally(
      promise,
      () => delete this.loadingRegistry[imageUrl]
    );
  }
}
