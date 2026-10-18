import { NextRequest, NextResponse } from 'next/server';
import { deleteTodo, updateTodo } from '@/lib/db';
import { UpdateTodoInput } from '@/types/todo';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todoId = parseInt(id, 10);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const body = await request.json();
    const input: UpdateTodoInput = {};

    if (body.title !== undefined) input.title = String(body.title);
    if (body.description !== undefined) input.description = body.description;
    if (body.priority !== undefined && ['low', 'medium', 'high'].includes(body.priority)) {
      input.priority = body.priority;
    }
    if (body.category !== undefined) input.category = String(body.category);
    if (body.completed !== undefined) input.completed = Boolean(body.completed);
    if (body.due_date !== undefined) input.due_date = body.due_date;

    const result = await updateTodo(todoId, input);
    if (!result.todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todoId = parseInt(id, 10);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const result = await deleteTodo(todoId);
    if (!result.success) {
      return NextResponse.json({ error: 'Todo not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true, isFallback: result.isFallback });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
