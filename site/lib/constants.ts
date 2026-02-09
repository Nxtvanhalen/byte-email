export const SITE = {
  name: 'Byte',
  tagline: 'Your AI Assistant Lives in Your Inbox',
  description:
    'No app. No login. No website. Just email byte@firstlyte.co and get intelligent AI responses in seconds.',
  email: 'byte@firstlyte.co',
  url: 'https://byte.firstlyte.co',
  author: 'Chris Bergstrom',
  authorUrl: 'https://chrisleebergstrom.com',
  github: 'https://github.com/Nxtvanhalen/byte-email',
} as const

export const FEATURES = [
  {
    icon: '💬',
    title: 'Ask Anything',
    description:
      'Questions, code help, writing, analysis — Byte handles it all with sharp, thoughtful responses.',
  },
  {
    icon: '📎',
    title: 'Image & PDF Analysis',
    description:
      'Attach screenshots, photos, PDFs, or spreadsheets. Byte sees and understands visual content.',
  },
  {
    icon: '🧠',
    title: 'Deep Thinking',
    description:
      'Include "THINK" in your email for complex problems. Byte takes its time and reasons through it.',
  },
  {
    icon: '🔗',
    title: 'Conversation Threads',
    description:
      'Just reply to keep the conversation going. Byte remembers context for 30 days per thread.',
  },
  {
    icon: '📱',
    title: 'Works Everywhere',
    description:
      'Phone, laptop, tablet, smartwatch — if it sends email, it works with Byte. Zero setup required.',
  },
] as const

export const STEPS = [
  {
    number: '01',
    title: 'Send an Email',
    description:
      'Compose a message to byte@firstlyte.co. Ask anything, attach files — no account needed.',
  },
  {
    number: '02',
    title: 'Byte Thinks',
    description:
      'AI analyzes your message, images, and attachments. Smart routing picks the best model.',
  },
  {
    number: '03',
    title: 'Get Your Reply',
    description: 'A thoughtful, styled response lands in your inbox. Usually under 30 seconds.',
  },
] as const
