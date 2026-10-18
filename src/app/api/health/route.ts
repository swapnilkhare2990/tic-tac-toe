import { NextResponse } from 'next/server';
import { checkConnection } from '@/lib/db';

export async function GET() {
  try {
    const status = await checkConnection();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: (error as Error).message || 'Database connection error',
        config: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          user: process.env.DB_USER || 'root',
          database: process.env.DB_NAME || 'todos_db',
        },
      },
      { status: 200 }
    );
  }
}
