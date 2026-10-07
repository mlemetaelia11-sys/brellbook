import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BrellBook',
    short_name: 'BrellBook',
    description: "Book it. Don't miss it.",
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F7F8FC',
    theme_color: '#1B1B3A',
    orientation: 'portrait-primary',
    icons: [
      { src: '/brellbook-icon.png', sizes: '1536x1536', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
