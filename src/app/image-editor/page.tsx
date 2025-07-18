
import { NavMenu } from '@/components/nav-menu';
import { ImageEditor } from '@/components/image-editor';

export default function ImageEditorPage() {
  return (
    <>
      <NavMenu />
      <main className="min-h-screen bg-background pt-24">
        <ImageEditor />
      </main>
    </>
  );
}
