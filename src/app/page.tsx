import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

const stickerCategories = [
  {
    title: 'Die-cut Stickers',
    description: 'Custom-shaped stickers with a premium look and feel.',
    href: '/die-cut',
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'die cut sticker'
  },
  {
    title: 'Kiss-cut Stickers',
    description: 'Individually cut stickers on a single backing sheet.',
    href: '/kiss-cut',
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'sticker sheet'
  },
  {
    title: 'Sticker Sheets',
    description: 'Multiple stickers, one page. Perfect for collections.',
    href: '/sheet',
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'sticker collection'
  },
  {
    title: 'Text Decals',
    description: 'Durable vinyl lettering for a clean, professional look.',
    href: '/decal',
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'vinyl decal'
  },
  {
    title: 'QR Code Stickers',
    description: 'Connect your physical brand to the digital world instantly.',
    href: '/qr-code',
    imageUrl: 'https://placehold.co/600x400.png',
    imageHint: 'qr code'
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
            Stickerific
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Unleash your creativity. Design and order high-quality custom stickers with ease.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stickerCategories.map((category) => (
            <Link href={category.href} key={category.title} className="group block">
              <Card className="bg-card h-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-2 border-border/50">
                <div className="relative h-48 w-full">
                  <Image
                    src={category.imageUrl}
                    alt={category.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={category.imageHint}
                  />
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-card-foreground">{category.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground flex-grow">{category.description}</p>
                   <div className="mt-4 flex items-center justify-end text-sm font-semibold text-primary group-hover:underline">
                      Customize
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
         <footer className="text-center mt-16 text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Stickerific. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}