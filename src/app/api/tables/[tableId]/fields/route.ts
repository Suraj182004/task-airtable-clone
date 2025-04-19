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
        const { name, type } = body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ success: false, message: 'Field name is required and must be a non-empty string.' }, { status: 400 });
        }
        if (!type || typeof type !== 'string' || !validFieldTypes.includes(type as FieldType)) {
            return NextResponse.json({ success: false, message: `Field type is required and must be one of: ${validFieldTypes.join(', ')}.` }, { status: 400 });
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

        
        const newField = {
            name: trimmedName,
            type: type as FieldType,
        };

       
        table.fields.push(newField as any);

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
           
            errorDetails = (error as any).errors;
            return NextResponse.json({ success: false, message, errors: errorDetails }, { status });
        } else if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ success: false, message }, { status });
    }
} 