import Backdrop from "@/components/Backdrop";
import Coupons from "@/components/Coupons";
import ExperienceProvider from "@/components/ExperienceProvider";
import Final from "@/components/Final";
import Game from "@/components/Game";
import Gate from "@/components/Gate";
import HeartPit from "@/components/HeartPit";
import Hero from "@/components/Hero";
import Letter from "@/components/Letter";
import MusicButton from "@/components/MusicButton";
import Reasons from "@/components/Reasons";
import Stats from "@/components/Stats";
import Journey from "@/components/Journey";
import { CONFIG } from "@/lib/config";

export default function Home() {
  return (
    <ExperienceProvider>
      <Backdrop />
      <Gate />
      <MusicButton />
      <main>
        <Hero />
        <Stats />
        <HeartPit />
        <Journey />
        <Reasons />
        <Game />
        <Coupons />
        <Letter />
        <Final />
      </main>
      <footer>Dibuat oleh {CONFIG.suami}, untuk {CONFIG.istri} &amp; {CONFIG.anak}</footer>
    </ExperienceProvider>
  );
}
