// /app/api/transcribe/route.ts

import { AssemblyAI } from 'assemblyai';
import { NextResponse } from 'next/server';

// Initialize the AssemblyAI client
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

export async function POST(request: Request) {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json(
      { error: "AssemblyAI API key not set on server." },
      { status: 500 }
    );
  }

  try {
    // The request will contain form data with the audio file
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    // The SDK can directly handle the audio data from the Blob
    const transcript = await client.transcripts.transcribe({
      audio: file,
      speech_model: "universal",
    });

    if (transcript.status === 'error') {
      return NextResponse.json({ error: transcript.error }, { status: 500 });
    }

    return NextResponse.json({ text: transcript.text });

  } catch (error: any) {
    console.error("Error in transcription route:", error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio.', details: error.message },
      { status: 500 }
    );
  }
}