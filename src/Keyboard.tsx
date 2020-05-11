import * as Tone from "tone";

import React, { useRef, useEffect, useState } from "react";
import cx from "classnames";
import css from "./Keyboard.module.css";
import { MIDIEvent } from "./App";

type KeyboardNoteKey =
  | "a"
  | "s"
  | "d"
  | "f"
  | "g"
  | "h"
  | "j"
  | "k"
  | "l"
  | "w"
  | "e"
  | "t"
  | "y"
  | "u"
  | "o";
type KeboardNote =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";
type KeyboardNotePitch = KeboardNote | "C8" | "C#8" | "D8";
const keybardToNoteMap = new Map<KeyboardNoteKey, KeyboardNotePitch>([
  ["a", "C"],
  ["w", "C#"],
  ["s", "D"],
  ["e", "D#"],
  ["d", "E"],
  ["f", "F"],
  ["t", "F#"],
  ["g", "G"],
  ["y", "G#"],
  ["h", "A"],
  ["u", "A#"],
  ["j", "B"],
  ["k", "C8"], // 1 octave higher than C
  ["o", "C#8"], // 1 octave higher than C#
  ["l", "D8"], // 1 octave higher than D
]);
const selectKeyboardKeyOctave = (
  key: KeyboardNotePitch,
  octave: number
): number => octave + (key.endsWith("8") ? 1 : 0);
const parseKeyboardKey = (key: string, octave: number): string | undefined => {
  try {
    return mapKeyboardKeyToNote(key as KeyboardNoteKey, octave);
  } catch (error) {
    return undefined;
  }
};
const mapKeyboardKeyToNote = (key: KeyboardNoteKey, octave: number): string => {
  const note = keybardToNoteMap.get(key);
  if (!note) {
    throw new Error("invalid key");
  }
  return `${note.replace("8", "")}${selectKeyboardKeyOctave(note, octave)}`;
};

export const Center: React.FC = ({ children }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};

const WhiteWithBlack = () => {
  return (
    <div className={css.whiteWithBlack}>
      <button className={css.white} />
      <button className={css.black} />
    </div>
  );
};
const White: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <div
      className={cx(css.white, {
        [css.active]: active,
      })}
    />
  );
};
const Black: React.FC<{ active: boolean }> = ({ active }) => {
  return (
    <button
      className={cx(css.black, {
        [css.active]: active,
      })}
    />
  );
};

const uniq = (list: string[]): string[] => {
  return Object.keys(
    list.reduce((counts, name) => {
      return { ...counts, ...{ [name]: 1 } };
    }, {} as { [key: string]: number })
  );
};

export const Keyboard: React.FC<{
  onMIDIEvent: (event: MIDIEvent) => void;
}> = ({ onMIDIEvent }) => {
  const octave = useRef<number>(4);
  const velocity = useRef<number>(30);
  const refActiveKeys = useRef<KeyboardNoteKey[]>([]);
  const [activeKeys, setActiveKeys] = useState<KeyboardNoteKey[]>([]);
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "z") {
        octave.current = Math.max(-1, octave.current - 1);
        return;
      }
      if (event.key === "x") {
        octave.current = Math.min(9, octave.current + 1);
        return;
      }
      // console.log(event);
      const key = event.key as KeyboardNoteKey;
      const note = parseKeyboardKey(event.key, octave.current);
      if (!note) {
        return;
      }
      const pitch = Tone.Frequency(note).toMidi();
      //   transport.send({ midi: [144, pitch, 30] });
      //   setTimeout(() => {
      //     transport.send({ midi: [128, pitch, 64] });
      //   }, 500);
      if (!refActiveKeys.current.includes(key)) {
        refActiveKeys.current = [...refActiveKeys.current, key];
        setActiveKeys(refActiveKeys.current);
        onMIDIEvent([144, pitch, velocity.current]);
      }
    };
    const handleKeyup = (event: KeyboardEvent) => {
      const key = event.key as KeyboardNoteKey;
      const note = parseKeyboardKey(event.key, octave.current);
      if (!note) {
        return;
      }
      const pitch = Tone.Frequency(note).toMidi();
      if (refActiveKeys.current.includes(key)) {
        refActiveKeys.current = refActiveKeys.current.filter(
          (key) => event.key !== key
        );
        setActiveKeys(refActiveKeys.current);
        onMIDIEvent([144, pitch, velocity.current]);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
    };
  }, [octave, refActiveKeys, onMIDIEvent]);

  //   const keys = [1, 1, 0, 1, 1, 1, 0]; // 1 for white with black, 0 only for white
  //   const renderKeys = () => {
  //     return keys.map((key, index) => {
  //       if (key === 1) {
  //         return <WhiteWithBlack key={index} />;
  //       } else if (key === 0) {
  //         return <White key={index} />;
  //       }
  //       throw new Error("undefined key");
  //     });
  //   };
  return (
    <div className={css.container}>
      <div className={css.whiteWithBlack}>
        <White active={activeKeys.includes("a")} />
        <Black active={activeKeys.includes("w")} />
      </div>
      <div className={css.whiteWithBlack}>
        <White active={activeKeys.includes("s")} />
        <Black active={activeKeys.includes("e")} />
      </div>
      <White active={activeKeys.includes("d")} />
      <div className={css.whiteWithBlack}>
        <White active={activeKeys.includes("f")} />
        <Black active={activeKeys.includes("t")} />
      </div>
      <div className={css.whiteWithBlack}>
        <White active={activeKeys.includes("g")} />
        <Black active={activeKeys.includes("y")} />
      </div>
      <div className={css.whiteWithBlack}>
        <White active={activeKeys.includes("h")} />
        <Black active={activeKeys.includes("u")} />
      </div>
      <White active={activeKeys.includes("j")} />
      <White active={activeKeys.includes("k")} />
      {/* {renderKeys()} */}
    </div>
  );
};
