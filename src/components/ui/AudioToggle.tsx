'use client';

import { useEffect, useRef, useState } from 'react';

type Ambient = { ctx: AudioContext; gain: GainNode };

// Off by default. Starts only from a click, since browsers block audio without a user gesture.
export function AudioToggle() {
  const [on, setOn] = useState(false);
  const sound = useRef<Ambient | null>(null);

  const toggle = () => {
    if (sound.current) {
      const { ctx, gain } = sound.current;
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => void ctx.close(), 300);
      sound.current = null;
      setOn(false);
      return;
    }
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gain.gain.setTargetAtTime(0.015, ctx.currentTime, 0.5); // very low volume, fade in
    sound.current = { ctx, gain };
    setOn(true);
  };

  useEffect(() => () => { void sound.current?.ctx.close(); }, []);

  return (
    <button className="btn btn-ghost" type="button" aria-pressed={on} onClick={toggle}>
      {on ? 'Sound on' : 'Sound off'}
    </button>
  );
}
