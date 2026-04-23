# Mistral Voice Mode

A ChatGPT-like live voice mode interface powered by Mistral AI. Speak naturally, get instant AI responses with high-quality text-to-speech. No tapping required — just talk and pause.

## Features

- **Live Voice-to-Voice** - Talk naturally, AI responds with speech
- **Auto-Stop on Silence** - Stop speaking and AI automatically processes after ~1.8s of silence
- **Barge-in / Interrupt** - Tap the orb or press space while AI is speaking to immediately cut in
- **3 Preset Voices** - Paul (US Male), Oliver (British Male), Jane (British Female)
- **Real-time Visualization** - Animated orb that responds to your voice
- **Conversation History** - Review your chat anytime

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS v4
- Mistral AI SDK (Voxtral TTS/STT, Small 4 LLM)
- Web Audio API + MediaRecorder + AnalyserNode (silence detection)

## Models Used

| Capability | Model |
|-----------|-------|
| LLM | `mistral-small-2603` |
| Text-to-Speech | `voxtral-mini-tts-2603` |
| Speech-to-Text | `voxtral-mini-latest` |

## Voices

| Voice | ID | Accent | Gender |
|-------|-----|--------|--------|
| Paul | `c69964a6-ab8b-4f8a-9465-ec0925096ec8` | US English | Male |
| Oliver | `e3596645-b1af-469e-b857-f18ddedc7652` | British English | Male |
| Jane | `a3e41ea8-020b-44c0-8d8b-f6cc03524e31` | British English | Female |

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) and allow microphone access.

## How to Use

1. **Tap the orb** or **press & hold Space** to start recording
2. Speak naturally
3. **Pause** (~1.8s silence) and AI automatically processes your message
4. Or **release Space** / **tap orb** to manually send
5. While AI is **thinking** or **speaking**, tap orb or press space to **interrupt** and speak again
6. Switch voices using the selector below the orb
7. View conversation history with the message button

## Environment Variables

Create `.env.local`:

```env
MISTRAL_API_KEY=your_api_key_here
```

## Project Structure

```
mistral-voice-mode/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts      # LLM chat completion
│   │   │   ├── tts/route.ts       # Text-to-speech
│   │   │   └── stt/route.ts       # Speech-to-text
│   │   ├── page.tsx               # Main voice mode UI
│   │   ├── layout.tsx             # Root layout
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── VoiceOrb.tsx           # Animated voice orb (Canvas)
│   │   ├── VoiceSelector.tsx      # Voice picker
│   │   └── ChatMessage.tsx        # Message bubble
│   └── lib/
│       ├── mistral.ts             # Mistral client
│       └── voices.ts              # Voice definitions
```

## Design

- Dark theme optimized for focused voice interaction
- Mistral brand orange accent (#fa500f)
- Bricolage Grotesque + Onest font pairing
- Canvas-based animated orb with wave distortion and glow rings
- Responsive layout for mobile and desktop
- Silence detection via Web Audio API AnalyserNode (RMS thresholding)
