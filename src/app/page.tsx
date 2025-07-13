import Image from 'next/image';
import { ProductCustomizer } from '@/components/product-customizer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <div className="flex items-start justify-center">
            <div className="sticky top-8 w-full max-w-lg aspect-square bg-card rounded-xl shadow-lg overflow-hidden border">
              <Image
                src="https://placehold.co/800x800.png"
                alt="Custom Sticker Preview"
                fill
                className="object-cover transition-transform duration-300 hover:scale-105"
                data-ai-hint="sticker design"
                priority
              />
            </div>
          </div>
          
          <div className="flex flex-col">
            <ProductCustomizer />
          </div>
        </div>
      </main>
    </div>
  );
}
