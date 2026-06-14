import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamCoachResponse, getCoachResponse } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { message, stream: useStream } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Parallel: fetch history + save user message
    const [historyResult] = await Promise.all([
      supabase
        .from('coach_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('coach_messages').insert({
        user_id: user.id,
        role: 'user',
        content: message.trim(),
      }),
    ]);

    const chatHistory = (historyResult.data ?? []).reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const messagesToSend = [
      ...chatHistory,
      { role: 'user' as const, content: message.trim() },
    ];

    // Stream response via SSE
    if (useStream) {
      const encoder = new TextEncoder();
      let fullResponse = '';

      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamCoachResponse(messagesToSend, profile)) {
              fullResponse += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
              );
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();

            // Save complete AI response to DB
            await supabase.from('coach_messages').insert({
              user_id: user.id,
              role: 'assistant',
              content: fullResponse,
            });
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : 'Stream error';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming fallback
    const aiResponse = await getCoachResponse(messagesToSend, profile);

    await supabase.from('coach_messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: aiResponse,
    });

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
