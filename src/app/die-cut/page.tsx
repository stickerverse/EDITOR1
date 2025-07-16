import { StickerCustomizer } from '@/components/sticker-customizer';

export default function DieCutPage() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <StickerCustomizer productType="die-cut" />
    </main>
  );
}
