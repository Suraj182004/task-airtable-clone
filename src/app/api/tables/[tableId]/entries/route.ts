import { NextRequest, NextResponse } from 'next/server';
import mongoose, { MongooseError } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Table from '@/models/Table';
import Entry from '@/models/Entry';
import { IField } from '@/models/Field';

interface RequestContext {
    params: {
        tableId: string;
    }
}


function validateData(data: Record<string, unknown>, fields: IField[]): { isValid: boolean; errors: Record<string, string>; validatedData: Record<string, unknown> } {
    const errors: Record<string, string> = {};
    const validatedData: Record<string, unknown> = {}; 
    let isValid = true;

    const fieldMap = new Map(fields.map(f => [f.name, f.type]));

    
    for (const key in data) {
        if (!fieldMap.has(key)) {
            errors[key] = `Field "${key}" does not exist in the table definition.`;
            isValid = false;
        }
    }

    
    for (const field of fields) {
        const fieldName = field.name;
        const fieldType = field.type;
        const value = data[fieldName];

       
        if (value === undefined || value === null || value === '') {
            validatedData[fieldName] = null; 
            continue; 
        }

        let fieldIsValid = true;
        let parsedValue: unknown = value; 

        switch (fieldType) {
            case 'text':
                if (typeof value !== 'string') {
                    errors[fieldName] = 'Must be a string.';
                    fieldIsValid = false;
                } else {
                    parsedValue = value.trim(); 
                }
                break;
            case 'number':
                const num = Number(value);
                if (isNaN(num)) {
                    errors[fieldName] = 'Must be a valid number.';
                    fieldIsValid = false;
                } else {
                    parsedValue = num; 
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (typeof value !== 'string' || !emailRegex.test(value)) {
                    errors[fieldName] = 'Must be a valid email address.';
                    fieldIsValid = false;
                } else {
                     parsedValue = value.trim(); 
                }
                break;
            case 'time':
                const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                if (typeof value !== 'string' || !timeRegex.test(value)) {
                    errors[fieldName] = 'Must be a valid time in HH:MM (24-hour) format.';
                    fieldIsValid = false;
                } else {
                     parsedValue = value.trim(); 
                }
                break;
            default:
                errors[fieldName] = `Unknown field type: ${fieldType}`;
                fieldIsValid = false;
                break;
        }

        if (fieldIsValid) {
            validatedData[fieldName] = parsedValue;
        } else {
            isValid = false;
        }
    }

    return { isValid, errors, validatedData };
}


export async function GET(request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const tableExists = await Table.findById(tableId).select('_id');
        if (!tableExists) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }

        const entries = await Entry.find({ tableId: tableId });
        return NextResponse.json({ success: true, data: entries }, { status: 200 });
    } catch (error: unknown) { 
        console.error('[API_TABLE_ENTRIES_GET]', error);
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
        const table = await Table.findById(tableId).select('fields');
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }

        const body = await request.json();
        
        const inputData = (body && typeof body === 'object' && body.data && typeof body.data === 'object' && !Array.isArray(body.data))
            ? body.data as Record<string, unknown>
            : null;

        if (inputData === null) {
             return NextResponse.json({ success: false, message: 'Request body must contain a non-array "data" object.' }, { status: 400 });
        }

        
        const { isValid, errors, validatedData } = validateData(inputData, table.fields);

        if (!isValid) {
            return NextResponse.json({ success: false, message: 'Data validation failed', errors }, { status: 400 });
        }

       
        const newEntry = await Entry.create({
            tableId: tableId,
            data: validatedData,
        });

        return NextResponse.json({ success: true, data: newEntry }, { status: 201 });

    } catch (error: unknown) { 
        console.error('[API_TABLE_ENTRIES_POST]', error);
        let message = 'Server Error adding entry';
        let status = 500;
        let errorDetails = {};

        if (error instanceof MongooseError && error.name === 'ValidationError') {
            message = error.message;
            status = 400;
           
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            errorDetails = (error as any).errors;
             return NextResponse.json({ success: false, message, errors: errorDetails }, { status });
        } else if (error instanceof Error) {
            message = error.message;
        }

        return NextResponse.json({ success: false, message }, { status });
    }
} 