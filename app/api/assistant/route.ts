import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID!;

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // 1. Create thread
  const threadRes = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const thread = await threadRes.json();

  // 2. Add user message
  await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'user',
      content: message,
    }),
  });

  // 3. Create run
  const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistant_id: ASSISTANT_ID,
    }),
  });

  const run = await runRes.json();

  // 4. Poll until completed
  let status = run.status;
  while (status !== 'completed' && status !== 'failed') {
    await new Promise((res) => setTimeout(res, 1000));
    const statusRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );
    const json = await statusRes.json();
    status = json.status;
  }

  // 5. Get final message
  const messagesRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages`,
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    }
  );

  const messages = await messagesRes.json();
  const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

  return NextResponse.json({
    message: assistantMessage?.content?.[0]?.text?.value ?? 'No response.',
  });
}
