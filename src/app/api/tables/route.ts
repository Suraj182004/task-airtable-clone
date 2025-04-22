import { NextResponse } from 'next/server';
import { MongooseError } from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Table from '@/models/Table';


export async function GET(): Promise<NextResponse> {
 
  await dbConnect();
  try {
    const tables = await Table.find({}).select('name createdAt updatedAt');
    return NextResponse.json({ success: true, data: tables }, { status: 200 });
  } catch (error: unknown) { 
    console.error('[API_TABLES_GET]', error);
    let message = 'Server Error';
    if (error instanceof Error) {
        message = error.message;
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}


export async function POST(request: Request): Promise<NextResponse> {
  await dbConnect();
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, message: 'Table name is required and must be a non-empty string.' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const existingTable = await Table.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
    if (existingTable) {
        return NextResponse.json({ success: false, message: `Table with name "${trimmedName}" already exists.` }, { status: 409 });
    }

    const newTable = await Table.create({ name: trimmedName });

    return NextResponse.json({ success: true, data: newTable }, { status: 201 });
  } catch (error: unknown) { 
    console.error('[API_TABLES_POST]', error);

    let message = 'Server Error creating table';
    let status = 500;
    let errorDetails = {};

    if (error instanceof MongooseError) {
        if (error.name === 'ValidationError') {
            message = error.message;
            status = 400;
            errorDetails = (error as MongooseError & { errors: Record<string, unknown> }).errors;
            return NextResponse.json({ success: false, message, errors: errorDetails }, { status });
        } else if ((error as MongooseError & { code?: number }).code === 11000) {
            message = `Table name must be unique. A table with the provided name likely already exists.`;
            status = 409;
        }
    } else if (error instanceof Error) {
     
        message = error.message;
    }

    return NextResponse.json({ success: false, message }, { status });
  }
}