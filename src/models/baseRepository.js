import mongoose from "mongoose";
import isEmpty from "../utils/isEmpty";
class BaseRepository {
  /**
   * @param {mongoose.Model} model
   */
  constructor(model) {
    this.model = model;
  }

  async findById(id, projection, populate) {
    return this.model
      .findById(id, projection)
      .populate(populate)
      .lean({ virtuals: true })
      .exec();
  }

  async findOne(filter, options = {}) {
    const { projection = {}, populate = {}, lean = true } = options;

    let query = this.model.findOne(filter, projection);
    if (!isEmpty(populate)) {
      query = query.populate(populate);
    }
    if (lean) {
      query = query.lean(options.leanOptions || { virtuals: true });
    }
    return query.exec();
  }

  async exist(filter = {}) {
    return this.model.exists(filter);
  }

  async find(filter = {}, options = {}) {
    const { skip = 0, limit = 0, projection = {}, populate = {}, sort = {} } = options;
    let query = this.model.find(filter, projection);
    if (!isEmpty(populate)) {
      if (Array.isArray(populate)) {
        populate.forEach(pop => {
          query = query.populate(pop)
        })
      } else {
        query = query.populate(populate)
      }
    }
    if (!isEmpty(sort)) {
      query = query.sort(sort);
    }
    return query.skip(skip).limit(limit).exec();
  }

  async create(data) {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(filter, updateData, options = {}) {
    const result = await this.model
      .updateOne(filter, { ...updateData, updatedAt: new Date() }, options)
      .exec();
    return result.modifiedCount > 0;
  }

  async findByIdAndUpdate(id, updateData) {
    return this.model
      .findByIdAndUpdate(id, { ...updateData, updatedAt: new Date() }, { new: true })
      .lean({ virtuals: true })
      .exec();
  }

  async updateMany(filter, updateData) {
    const result = await this.model
      .updateMany(filter, { ...updateData, updatedAt: new Date() })
      .exec();
    return result.modifiedCount;
  }

  async delete(id) {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter).exec();
  }

  async aggregate(pipeline) {
    return this.model.aggregate(pipeline).exec();
  }

  async distinct(field, filter = {}) {
    return this.model.distinct(field, filter).exec();
  }

  async bulkWrite(operations) {
    return this.model.bulkWrite(operations);
  }

  async createIndex(fieldOrSpec, options) {
    return this.model.collection.createIndex(fieldOrSpec, options);
  }

  async dropIndex(indexName) {
    await this.model.collection.dropIndex(indexName);
  }

  async listIndexes() {
    return this.model.collection.listIndexes().toArray();
  }
}

export default BaseRepository;
