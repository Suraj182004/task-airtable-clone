import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { IField, validFieldTypes } from './Field'; 


export interface ITable extends Document {
  name: string;
  fields: IField[]; 
  createdAt: Date;
  updatedAt: Date;
}

// Create a fresh copy of the FieldSchema to ensure it has the latest schema definition
const FieldSchemaForTable = new Schema({
  name: {
    type: String,
    required: [true, 'Field name is required.'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Field type is required.'],
    enum: {
      values: validFieldTypes,
      message: `Field type must be one of: ${validFieldTypes.join(', ')}.`,
    },
  },
  options: {
    type: [String],
    required: function(this: { type: string }) {
      return this.type === 'multiple_choice';
    },
    validate: {
      validator: function(this: { type: string }, options: string[]) {
        return this.type !== 'multiple_choice' || (options && options.length > 0);
      },
      message: 'Multiple choice fields must have at least one option.'
    }
  }
});

const TableSchema: Schema<ITable> = new Schema({
  name: {
    type: String,
    required: [true, 'Table name is required.'],
    trim: true,
    unique: true, 
  },
  fields: {
    type: [FieldSchemaForTable], 
    default: [], 
    validate: {
        validator: function(fields: IField[]) {
            // Ensure field names are unique within the table
            const names = fields.map(f => f.name);
            return new Set(names).size === names.length;
        },
        message: 'Field names within a table must be unique.'
    }
  },
}, {
  timestamps: true, 
});


// Ensure models are correctly registered
const Table: Model<ITable> = models.Table || mongoose.model<ITable>('Table', TableSchema);

export default Table; 