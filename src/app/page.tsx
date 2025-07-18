"use client";
import { NavMenu } from "@/components/nav-menu";
import { CosmicParallaxBg } from "@/components/ui/parallax-cosmic-background";

export default function HomePage() {
  return (
    <>
      <NavMenu />
      <main>
        <CosmicParallaxBg
          head="Stickerific"
          text="Your Vision, Your Sticker, Instantly"
          loop={true}
        />
      </main>
    </>
  );
}
