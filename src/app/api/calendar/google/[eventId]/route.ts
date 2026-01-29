import { NextRequest, NextResponse } from 'next/server';
import { updateEvent, deleteEvent, getEvent } from '@/services/google-calendar-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
    try {
        const event = await getEvent(params.eventId);
        return NextResponse.json(event);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { eventId: string } }) {
    try {
        const body = await req.json();
        const updated = await updateEvent(params.eventId, body);
        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('Update Event Error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { eventId: string } }) {
    try {
        await deleteEvent(params.eventId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Event Error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
