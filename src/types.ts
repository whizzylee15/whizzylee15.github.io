export interface Sticker {
  id: string;
  url: string; // Blob URL or Proxy URL
  name?: string;
  emoji?: string;
  file?: File; // Present if uploaded manually
  telegramFileId?: string; // Present if from Telegram
  isAnimated?: boolean; // True if it's a video or gzipped lottie or animated webp
}

export interface StickerPackInfo {
  name: string;
  publisher: string;
  stickers: Sticker[];
}

export interface PackMetadata {
  title: string;
  author: string;
}
