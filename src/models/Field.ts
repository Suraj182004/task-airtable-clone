import mongoose, { Schema, Document, models, Model } from 'mongoose';


export const validFieldTypes = ['text', 'number', 'email', 'time', 'multiple_choice'] as const;
export type FieldType = typeof validFieldTypes[number];

export interface IField extends Document {
  name: string;
  type: FieldType;
  options?: string[]; // For multiple_choice field type
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
      message: `Field type must be one of: ${validFieldTypes.join(', ')}.`,
    },
  },
  options: {
    type: [String],
    required: function(this: IField) {
      return this.type === 'multiple_choice';
    },
    validate: {
      validator: function(this: IField, options: string[]) {
        return this.type !== 'multiple_choice' || (options && options.length > 0);
      },
      message: 'Multiple choice fields must have at least one option.'
    }
  }
});


export { FieldSchema };

// Ensure models are correctly registered
const Field: Model<IField> = models.Field || mongoose.model<IField>('Field', FieldSchema);

export default Field; 