import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Table from '@/models/Table';
import Entry from '@/models/Entry';

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

// DELETE /api/tables/[tableId] - Deletes a specific table and all its entries
export async function DELETE(_request: NextRequest, context: RequestContext) {
    const { tableId } = context.params;
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(tableId)) {
        return NextResponse.json({ success: false, message: 'Invalid Table ID format' }, { status: 400 });
    }

    try {
        // Start a MongoDB session and transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Find and delete the table
            const table = await Table.findByIdAndDelete(tableId, { session });
            if (!table) {
                await session.abortTransaction();
                session.endSession();
                return NextResponse.json({ success: false, message: 'Table not found' }, { status: 404 });
            }

            // Delete all entries associated with this table
            await Entry.deleteMany({ tableId }, { session });

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            return NextResponse.json({ 
                success: true, 
                message: 'Table and all associated entries deleted successfully' 
            }, { status: 200 });
        } catch (error) {
            // If there's an error, abort the transaction
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    } catch (error: unknown) {
        console.error('[API_TABLE_DELETE]', error);
        let message = 'Server Error deleting table';
        if (error instanceof Error) {
            message = error.message;
        }
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
} 