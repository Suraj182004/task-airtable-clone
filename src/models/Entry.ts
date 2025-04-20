import mongoose, { Schema, Document, models, Model, Types } from 'mongoose';


export interface IEntry extends Document {
  tableId: Types.ObjectId; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Map<string, any>; 
  createdAt: Date;
  updatedAt: Date;
}


const EntrySchema: Schema<IEntry> = new Schema({
  tableId: {
    type: Schema.Types.ObjectId,
    ref: 'Table', 
    required: [true, 'Table reference is required.'],
    index: true,
  },
 
  data: {
    type: Map,
    of: Schema.Types.Mixed,
    required: true,
    default: {},
  },
}, {
  timestamps: true, 
});


const Entry: Model<IEntry> = models.Entry || mongoose.model<IEntry>('Entry', EntrySchema);

export default Entry; 