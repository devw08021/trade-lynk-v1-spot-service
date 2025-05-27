import {
  Model,
  Document,
  ProjectionType,
  PopulateOptions,
} from "mongoose";
// At the top of your file

type LeanDoc<T> = T extends Document<infer U, any, any> ? U : T;

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(
    id: string,
    projection?: ProjectionType<T>,
    populate?: string | PopulateOptions | (string | PopulateOptions)[]
  ): Promise<LeanDoc<T> | null> {
    return this.model
      .findById(id, projection)
      .populate(populate)
      .lean<LeanDoc<T>>({ virtuals: true })
      .exec();
  }

  async findOne(
    filter: Partial<Record<keyof T, any>>,
    projection?: ProjectionType<T>,
    populate?: string | PopulateOptions | (string | PopulateOptions)[]
  ): Promise<LeanDoc<T> | null> {
    return this.model
      .findOne(filter)
      .populate(populate)
      .lean<LeanDoc<T>>({ virtuals: true })
      .exec();
  }

  async create(data: Omit<T, "_id">): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  async update(id: string, updateData: Partial<T>): Promise<boolean> {
    const result = await this.model
      .updateOne({ _id: id }, { ...updateData, updatedAt: new Date() })
      .exec();

    return result.modifiedCount > 0;
  }

  async findByIdAndUpdate(
    id: string,
    updateData: Partial<T>
  ): Promise<LeanDoc<T> | null> {
    return this.model
      .findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      )
      .lean<LeanDoc<T>>({ virtuals: true })
      .exec();
  }
  async updateMany(
    filter: Partial<Record<keyof T, any>>,
    updateData: Partial<T>
  ): Promise<number> {
    const result = await this.model
      .updateMany(filter, { ...updateData, updatedAt: new Date() })
      .exec();

    // Return number of documents modified
    return result.modifiedCount;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async find(
    filter: Partial<Record<keyof T, any>> = {},
    options: {
      skip?: number;
      limit?: number;
      projection?: Record<string, 0 | 1 | boolean>;
    } = {}
  ): Promise<T[]> {
    const { skip, limit, projection } = options;
    return this.model
      .find(filter, projection)
      .skip(skip || 0)
      .limit(limit || 0)
      .exec();
  }

  async count(filter: Partial<Record<keyof T, any>> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async aggregate(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }

  async distinct(
    field: string,
    filter: Partial<Record<keyof T, any>> = {}
  ): Promise<any[]> {
    return this.model.distinct(field, filter).exec();
  }

  async bulkWrite(operations: any[]): Promise<any> {
    return this.model.bulkWrite(operations);
  }

  async createIndex(fieldOrSpec: any, options?: any): Promise<string> {
    return this.model.collection.createIndex(fieldOrSpec, options);
  }

  async dropIndex(indexName: string): Promise<void> {
    await this.model.collection.dropIndex(indexName);
  }

  async listIndexes(): Promise<any[]> {
    return this.model.collection.listIndexes().toArray();
  }
}
