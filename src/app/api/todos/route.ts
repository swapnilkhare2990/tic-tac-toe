import { NextRequest, NextResponse } from 'next/server';
import { createTodo, getAllTodos } from '@/lib/db';
import { CreateTodoInput } from '@/types/todo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const category = searchParams.get('category') || undefined;

    const result = await getAllTodos({ search, status, priority, category });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be non-empty' },
        { status: 400 }
      );
    }

    const input: CreateTodoInput = {
      title: body.title,
      description: body.description,
      priority: ['low', 'medium', 'high'].includes(body.priority) ? body.priority : 'medium',
      category: body.category || 'General',
      due_date: body.due_date || null,
    };

    const result = await createTodo(input);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create todo' },
      { status: 500 }
    );
  }
}
