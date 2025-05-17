import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const webhook = process.env.SLACK_WEBHOOK;

  if (!webhook) {
    return NextResponse.json({ error: 'SLACK_WEBHOOK not configured' }, { status: 500 });
  }

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return NextResponse.json({ ok: true });
}
