import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCoachResponse } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
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
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { data: history, error: historyError } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) {
      console.error('Failed to load chat history:', historyError);
    }

    const chatHistory = (history ?? []).reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const { error: saveUserMsgError } = await supabase
      .from('coach_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: message.trim(),
      });

    if (saveUserMsgError) {
      console.error('Failed to save user message:', saveUserMsgError);
    }

    const messagesToSend = [
      ...chatHistory,
      { role: 'user' as const, content: message.trim() },
    ];

    const aiResponse = await getCoachResponse(messagesToSend, profile);

    const { error: saveAiMsgError } = await supabase
      .from('coach_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: aiResponse,
      });

    if (saveAiMsgError) {
      console.error('Failed to save AI response:', saveAiMsgError);
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Chat API error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
