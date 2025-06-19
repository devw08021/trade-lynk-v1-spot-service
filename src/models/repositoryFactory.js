import BaseRepository from "./baseRepository.js";

export function getRepository(model) {
  return new BaseRepository(model);
}
