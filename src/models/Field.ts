import mongoose, { Schema, Document, models, Model } from 'mongoose';


export const validFieldTypes = ['text', 'number', 'email', 'time', 'multiple_choice', 'website', 'date'] as const;
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
    required: function(this: { type: FieldType }) {
      return this.type === 'multiple_choice';
    },
    validate: {
      validator: function(this: { type: FieldType }, options: string[]) {
        return this.type !== 'multiple_choice' || (options && options.length > 0 && options.every(opt => typeof opt === 'string' && opt.trim() !== ''));
      },
      message: 'Multiple choice fields must have at least one non-empty option.'
    },
    default: function(this: { type: FieldType }) {
        return this.type === 'multiple_choice' ? [] : undefined;
    }
  },
  // Add basic validation stubs if needed - Mongoose handles date type inherently
  // website: { type: String } // No extra validation here, handled in API/Frontend
  // date: { type: Date } // Mongoose handles Date type
});

FieldSchema.pre('save', function(next) {
  if (this.type !== 'multiple_choice') {
    this.options = undefined;
  }
  next();
});

export { FieldSchema };

// Ensure models are correctly registered
const Field: Model<IField> = models.Field || mongoose.model<IField>('Field', FieldSchema);

export default Field; 

