
import { StickerCustomizer } from '@/components/sticker-customizer';
import { NavMenu } from '@/components/nav-menu';

export default function SheetPage() {
  return (
    <>
      <NavMenu />
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4 pt-24">
        <StickerCustomizer productType="sheet" />
      </main>
    </>
  );
}
