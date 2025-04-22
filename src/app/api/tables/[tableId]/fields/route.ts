import { NextRequest, NextResponse } from 'next/server';
import mongoose, { MongooseError } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Table from '@/models/Table';
import { validFieldTypes, FieldType, IField } from '@/models/Field';

interface RequestContext {
    params: {
        tableId: string;
    }
}


export async function GET(_request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const table = await Table.findById(tableId).select('fields');
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: table.fields }, { status: 200 });
    } catch (error: unknown) {
        console.error('[API_TABLE_FIELDS_GET]', error);
        let message = 'Server Error';
        if (error instanceof Error) {
            message = error.message;
        }
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}

export async function POST(request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { name, type, options } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ success: false, message: 'Field name is required and must be a non-empty string.' }, { status: 400 });
        }
        if (!type || typeof type !== 'string' || !validFieldTypes.includes(type as FieldType)) {
            return NextResponse.json({ success: false, message: `Field type is required and must be one of: ${validFieldTypes.join(', ')}.` }, { status: 400 });
        }

        // Validate options for multiple_choice type
        if (type === 'multiple_choice') {
            if (!options || !Array.isArray(options) || options.length === 0) {
                return NextResponse.json({ 
                    success: false, 
                    message: 'Multiple choice fields must have at least one option.' 
                }, { status: 400 });
            }
            
            // Ensure all options are strings
            if (!options.every(opt => typeof opt === 'string' && opt.trim() !== '')) {
                return NextResponse.json({ 
                    success: false, 
                    message: 'All options must be non-empty strings.' 
                }, { status: 400 });
            }
        }

        const trimmedName = name.trim();

        const table = await Table.findById(tableId);
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }

        const fieldExists = table.fields.some(
            field => field.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (fieldExists) {
            return NextResponse.json({ success: false, message: `Field with name "${trimmedName}" already exists in this table.` }, { status: 409 });
        }

        
        // Define a proper type for the new field
        interface NewField {
            name: string;
            type: FieldType;
            options?: string[];
        }
        
        const newField: NewField = {
            name: trimmedName,
            type: type as FieldType,
        };

        // Add options if it's a multiple_choice field
        if (type === 'multiple_choice' && options) {
            newField.options = options;
        }

       
        table.fields.push(newField as unknown as IField);

        await table.save();

       
        const addedField = table.fields[table.fields.length - 1];

        return NextResponse.json({ success: true, data: addedField }, { status: 201 });

    } catch (error: unknown) {
        console.error('[API_TABLE_FIELDS_POST]', error);

        let message = 'Server Error adding field';
        let status = 500;
        let errorDetails = {};

        if (error instanceof MongooseError && error.name === 'ValidationError') {
            message = error.message;
            status = 400;
           
            errorDetails = (error as MongooseError & { errors: Record<string, unknown> }).errors;
            return NextResponse.json({ success: false, message, errors: errorDetails }, { status });
        } else if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ success: false, message }, { status });
    }
}


export async function PUT(request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { fieldId, name, type, options } = body;

        if (!fieldId || !mongoose.Types.ObjectId.isValid(fieldId)) {
            return NextResponse.json({ success: false, message: 'Valid field ID is required' }, { status: 400 });
        }

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ success: false, message: 'Field name is required and must be a non-empty string.' }, { status: 400 });
        }

        if (!type || typeof type !== 'string' || !validFieldTypes.includes(type as FieldType)) {
            return NextResponse.json({ success: false, message: `Field type must be one of: ${validFieldTypes.join(', ')}.` }, { status: 400 });
        }

        // Validate options for multiple_choice type
        if (type === 'multiple_choice') {
            if (!options || !Array.isArray(options) || options.length === 0) {
                return NextResponse.json({ 
                    success: false, 
                    message: 'Multiple choice fields must have at least one option.' 
                }, { status: 400 });
            }
            
            // Ensure all options are strings
            if (!options.every(opt => typeof opt === 'string' && opt.trim() !== '')) {
                return NextResponse.json({ 
                    success: false, 
                    message: 'All options must be non-empty strings.' 
                }, { status: 400 });
            }
        }

        const trimmedName = name.trim();

        const table = await Table.findById(tableId);
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }

        const fieldIndex = table.fields.findIndex(
            field => String(field._id) === fieldId
        );

        if (fieldIndex === -1) {
            return NextResponse.json({ success: false, message: 'Field not found' }, { status: 404 });
        }

       
        const fieldNameExists = table.fields.some(
            (field, index) => index !== fieldIndex && 
            field.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (fieldNameExists) {
            return NextResponse.json({ success: false, message: `Field with name "${trimmedName}" already exists in this table.` }, { status: 409 });
        }

       
        table.fields[fieldIndex].name = trimmedName;
        table.fields[fieldIndex].type = type as FieldType;
        
        // Update options if it's a multiple_choice field
        if (type === 'multiple_choice' && options) {
            table.fields[fieldIndex].options = options;
        } else if (type !== 'multiple_choice') {
            // For non-multiple_choice fields, set options to undefined or empty array
            // Mongoose will handle this appropriately
            table.fields[fieldIndex].options = undefined;
        }

        await table.save();

        return NextResponse.json({ 
            success: true, 
            data: table.fields[fieldIndex],
            message: 'Field updated successfully' 
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API_TABLE_FIELDS_PUT]', error);
        
        let message = 'Server Error updating field';
        let status = 500;
        let errorDetails = {};

        if (error instanceof MongooseError && error.name === 'ValidationError') {
            message = error.message;
            status = 400;
            
            errorDetails = (error as MongooseError & { errors: Record<string, unknown> }).errors;
            return NextResponse.json({ success: false, message, errors: errorDetails }, { status });
        } else if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ success: false, message }, { status });
    }
}


export async function DELETE(request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const fieldId = searchParams.get('fieldId');

        if (!fieldId || !mongoose.Types.ObjectId.isValid(fieldId)) {
            return NextResponse.json({ success: false, message: 'Valid field ID is required' }, { status: 400 });
        }

        const table = await Table.findById(tableId);
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }

     
        const fieldIndex = table.fields.findIndex(
            field => String(field._id) === fieldId
        );

        if (fieldIndex === -1) {
            return NextResponse.json({ success: false, message: 'Field not found' }, { status: 404 });
        }

       
        const deletedFieldName = table.fields[fieldIndex].name;

        
        table.fields.splice(fieldIndex, 1);
        await table.save();


        return NextResponse.json({ 
            success: true, 
            message: 'Field deleted successfully',
            data: { fieldId, fieldName: deletedFieldName }
        }, { status: 200 });

    } catch (error: unknown) {
        console.error('[API_TABLE_FIELDS_DELETE]', error);
        
        const status = 500;
        let message = 'Server Error deleting field';

        if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ success: false, message }, { status });
    }
} 