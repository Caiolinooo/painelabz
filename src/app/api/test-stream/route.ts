import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const words = ['Teste ', 'de ', 'stream ', 'funcionando ', 'perfeitamente!'];
      
      for (const word of words) {
        const payload = `data: ${***REMOVED*** content: word, done: false })}\n\n`;
        controller.enqueue(encoder.encode(payload));
        await new Promise(r => setTimeout(r, 200));
      }
      
      const endPayload = `data: ${***REMOVED*** done: true, fullContent: words.join('') })}\n\n`;
      controller.enqueue(encoder.encode(endPayload));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
