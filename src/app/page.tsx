import { StickerCustomizer } from '@/components/sticker-customizer';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-300 via-blue-300 to-green-300 p-4 sm:p-8 md:p-12">
      <StickerCustomizer />
    </main>
  );
}
