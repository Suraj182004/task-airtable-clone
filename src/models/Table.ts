import mongoose, { Schema, Document, models, Model } from 'mongoose';
import { FieldSchema, IField } from './Field'; 


export interface ITable extends Document {
  name: string;
  fields: IField[]; 
  createdAt: Date;
  updatedAt: Date;
}


const TableSchema: Schema<ITable> = new Schema({
  name: {
    type: String,
    required: [true, 'Table name is required.'],
    trim: true,
    unique: true, 
  },
  fields: {
    type: [FieldSchema], 
    default: [], 
    validate: {
        validator: function(fields: IField[]) {
            
            const names = fields.map(f => f.name);
            return new Set(names).size === names.length;
        },
        message: 'Field names within a table must be unique.'
    }
  },
}, {
  timestamps: true, 
});


const Table: Model<ITable> = models.Table || mongoose.model<ITable>('Table', TableSchema);

export default Table; 