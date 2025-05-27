import { BaseRepository } from "./baseRepository";

export function getRepository<T>(model: Model<T>): BaseRepository<T> {
  return new BaseRepository<T>(model);
}
