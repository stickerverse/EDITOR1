
"use client";
import { CosmicParallaxBg } from "@/components/ui/parallax-cosmic-background";

export default function HomePage() {
  return (
    <main>
      <CosmicParallaxBg 
        head="Stickerific" 
        text="Your Vision, Your Sticker, Instantly" 
        loop={true}
      />
    </main>
  );
}
