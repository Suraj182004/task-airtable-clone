import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Table from '@/models/Table';

interface RequestContext {
    params: {
        tableId: string;
    }
}

// GET /api/tables/[tableId] - Fetches a specific table by ID
export async function GET(_request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        const table = await Table.findById(tableId);
        if (!table) {
            return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: table }, { status: 200 });
    } catch (error: unknown) {
        console.error('[API_TABLE_GET]', error);
        let message = 'Server Error';
        if (error instanceof Error) {
            message = error.message;
        }
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
} 