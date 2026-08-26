import { localStorageArea, type StorageAreaLike } from "./chrome-storage";

const READING_POSITIONS_KEY = "readingPositions";

export class ReadingPositionStore {
  constructor(private readonly area: StorageAreaLike = localStorageArea()) {}

  async get(url: string): Promise<number> {
    const data = await this.area.get(READING_POSITIONS_KEY);
    const positions =
      (data[READING_POSITIONS_KEY] as Record<string, number> | undefined) ?? {};
    const position = positions[url];
    return typeof position === "number" &&
      Number.isFinite(position) &&
      position >= 0
      ? position
      : 0;
  }

  async set(url: string, position: number): Promise<void> {
    const data = await this.area.get(READING_POSITIONS_KEY);
    const positions =
      (data[READING_POSITIONS_KEY] as Record<string, number> | undefined) ?? {};
    await this.area.set({
      [READING_POSITIONS_KEY]: {
        ...positions,
        [url]: Math.max(0, Number.isFinite(position) ? position : 0),
      },
    });
  }
}
