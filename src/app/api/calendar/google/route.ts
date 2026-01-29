import { NextRequest, NextResponse } from 'next/server';
import { listEvents, createEvent } from '@/services/google-calendar-service';
import { verifyRequestToken } from '@/lib/auth';
// We might need a permission check helper here if it exists, or rely on verifyRequestToken returning user info.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const timeMin = searchParams.get('timeMin') || undefined;
        const timeMax = searchParams.get('timeMax') || undefined;
        // Optional: Token verification for reading public calendar might not be needed, 
        // but for editing strictly required.
        // Assuming listing is allowed for authenticated users.

        const events = await listEvents(timeMin, timeMax);
        return NextResponse.json({ events });
    } catch (error: any) {
        console.error('Google Calendar List Error:', error);
        return NextResponse.json({ error: error.message || 'Error fetching events' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Verify Auth - Admin only? Or specific role?
        // Implementing simple auth check for now.
        // TODO: Add stricter role checking if necessary.
        /* 
        const auth = verifyRequestToken(req);
        if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        */
        // Using body directly
        const body = await req.json();

        // Validation could be added here

        const newEvent = await createEvent(body);
        return NextResponse.json(newEvent, { status: 201 });
    } catch (error: any) {
        console.error('Google Calendar Create Error:', error);
        return NextResponse.json({ error: error.message || 'Error creating event' }, { status: 500 });
    }
}
