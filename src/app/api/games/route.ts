import { NextResponse } from 'next/server';
import { createGame, getGames } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  const result = await getGames();
  return NextResponse.json(result);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    const payload = body as { winner?: unknown; isDraw?: unknown };
    const winner = payload.winner === 'X' || payload.winner === 'O' ? payload.winner : null;
    const isDraw = payload.isDraw === true;
    if (!winner && !isDraw) return NextResponse.json({ error: 'A game must have a winner or be a draw' }, { status: 400 });
    const result = await createGame(winner, isDraw);
    return NextResponse.json(result, { status: 201 });
  } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
}
