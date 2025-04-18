import mongoose, { Schema, Document, models, Model } from 'mongoose';


export const validFieldTypes = ['text', 'number', 'email', 'time'] as const;
export type FieldType = typeof validFieldTypes[number];

export interface IField extends Document {
  name: string;
  type: FieldType;
  
}


const FieldSchema: Schema<IField> = new Schema({
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
      message: 'Field type must be one of: text, number, email, time.',
    },
  },
});


export { FieldSchema };


const Field: Model<IField> = models.Field || mongoose.model<IField>('Field', FieldSchema);

export default Field; 