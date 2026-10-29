import type { Metadata } from "next";
import StoryStudio from "@/components/StoryStudio";

export const metadata: Metadata = { title: "Story Studio" };

// halaman terpisah (tidak ditautkan dari website utama) untuk membuat video Story 3D dari foto pilihan
export default function StudioPage() {
  return <StoryStudio />;
}
