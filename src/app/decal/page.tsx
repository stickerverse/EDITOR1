import { StickerCustomizer } from '@/components/sticker-customizer';
import { NavMenu } from '@/components/nav-menu';

export default function DecalPage() {
  return (
    <>
      <NavMenu />
      <main className="min-h-screen flex items-center justify-center p-4 pt-24">
        <StickerCustomizer productType="decal" />
      </main>
    </>
  );
}
