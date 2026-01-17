<div align="center">
 <h1>Aura</h1>
  <p><em>A quiet space for your mind.</em></p>
   
Aura is a private sanctuary for your thoughts. It's a mental health journaling application that provides a gentle, supportive space for reflection, pattern recognition, and emotional clarity—all with privacy-first design and local encryption.
  <img width="1200" height="475" alt="Aura Banner" src="/public/banner.png" />
 

</div>


## Features

- **Private Journaling**: Your thoughts are encrypted and stored locally—nothing leaves your device
- **Gentle AI Guidance**: Calm, supportive conversational AI that helps you untangle your mind
- **Emotional Clarity**: Passive, privacy-first analysis to identify patterns in mood and behavior
- **Beautiful Interface**: Minimalist, calming design that reduces cognitive load
- **Vision Mode**: Visual mood tracking and pattern recognition

## Quick Start

**Prerequisites:** Node.js 18+ and npm

1. **Clone and install**
   ```bash
   git clone https://github.com/vedaaanggshetty/Aura.git
   cd Aura
   npm install
   ```

2. **Environment setup**
   Create a `.env.local` file in the root:
   ```env
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_CLERK_SECRET_KEY=your_clerk_secret_key
   ```

3. **Run the app**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS with custom design system
- **Auth**: Clerk (secure user authentication)
- **Backend**: NGROK-tunnelled API for AI chat
- **Storage**: LocalStorage with encryption
- **Animations**: Framer-motion (minimal, tasteful)

## Project Structure

```
├── components/          # React components
│   ├── ChatInterface.tsx    # Main chat/journal view
│   ├── Landing.tsx          # Landing page
│   ├── Navigation.tsx       # Top navigation
│   ├── AuthContext.tsx      # Authentication context
│   └── ui/                  # Reusable UI components
├── services/              # Business logic
│   ├── chatService.ts      # AI chat API client
│   └── journalStore.ts     # Local storage management
├── types.ts               # TypeScript definitions
└── constants.ts           # App constants
```

## Privacy & Security

- All journal entries are stored locally in your browser
- Content is encrypted before storage
- No data is sent to external analytics services
- Authentication handled securely through Clerk
- Optional AI chat uses tunneled API endpoints

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with care for mental health and digital wellbeing
- Inspired by the need for private, thoughtful journaling spaces
- Icons by [Lucide](https://lucide.dev/)
- Design system inspired by editorial and print aesthetics
