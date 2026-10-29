"use client";

import { useState } from "react";
import { toggleMusic } from "@/lib/audio";
import { useExperience } from "./ExperienceProvider";

export default function MusicButton() {
  const { opened } = useExperience();
  const [on, setOn] = useState(true);
  if (!opened) return null;
  return (
    <button
      className={`music-btn${on ? "" : " off"}`}
      onClick={() => setOn(toggleMusic())}
      aria-label={on ? "Matikan musik" : "Nyalakan musik"}
      aria-pressed={on}
    >
      <span className="eq" aria-hidden="true"><i /><i /><i /></span>
    </button>
  );
}
