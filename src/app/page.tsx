import Link from 'next/link';
import { Scissors, Sheet, Type, QrCode } from 'lucide-react';
import { ContourCutIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const productTypes = [
  {
    name: 'Die-cut Stickers',
    description: 'Custom shapes that follow the contour of your design.',
    href: '/die-cut',
    icon: Scissors,
    color: 'from-indigo-500 to-purple-500',
  },
  {
    name: 'Sticker Sheets',
    description: 'Multiple stickers arranged on a single backing sheet.',
    href: '/sheet',
    icon: Sheet,
    color: 'from-purple-500 to-pink-500',
  },
  {
    name: 'Kiss-cut Stickers',
    description: 'Easy-to-peel stickers with a surrounding border.',
    href: '/kiss-cut',
    icon: ContourCutIcon,
    color: 'from-pink-500 to-orange-500',
  },
  {
    name: 'Text Decals',
    description: 'Durable vinyl lettering and numbers for any surface.',
    href: '/decal',
    icon: Type,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    name: 'QR Code Stickers',
    description: 'Generate and print stickers with a scannable QR code.',
    href: '/qr-code',
    icon: QrCode,
    color: 'from-sky-500 to-blue-500',
  },
];

const ThemedCard = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn(
        "group relative flex w-full flex-col rounded-xl bg-slate-950 p-6 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/20",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-30"></div>
      <div className="absolute inset-px rounded-[11px] bg-slate-950"></div>
      <div className="relative h-full">
        {children}
      </div>
    </div>
);


export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white mb-4">
          Welcome to Stickerific
        </h1>
        <p className="text-xl text-slate-400">
          Choose a product to start creating your custom stickers.
        </p>
      </div>
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {productTypes.map((product) => (
          <Link href={product.href} key={product.name} className="group">
            <ThemedCard className="h-full transform transition-transform duration-300 group-hover:-translate-y-2">
              <div className="flex flex-col items-start h-full">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br text-white mb-4", product.color)}>
                  <product.icon className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">{product.name}</h2>
                <p className="text-slate-400 flex-grow">{product.description}</p>
                <div className="mt-6 text-indigo-400 font-semibold flex items-center">
                  Start Creating
                  <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1.5">&rarr;</span>
                </div>
              </div>
            </ThemedCard>
          </Link>
        ))}
      </div>
    </main>
  );
}
