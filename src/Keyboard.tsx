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
type KeyboardPitchVelocity = "z" | "x" | "c" | "v";
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

const keyCodeToNoteKeyMap = new Map<
  number,
  KeyboardNoteKey | KeyboardPitchVelocity
>([
  // notes
  [65, "a"],
  [87, "w"],
  [83, "s"],
  [69, "e"],
  [68, "d"],
  [70, "f"],
  [84, "t"],
  [71, "g"],
  [89, "y"],
  [72, "h"],
  [85, "u"],
  [74, "j"],
  [75, "k"],
  [79, "o"],
  [76, "l"],
  // veloctity, octave shift
  [90, "z"],
  [88, "x"],
  [67, "c"],
  [86, "v"],
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

const White: React.FC<{
  active: boolean;
  onPress: () => void;
  onRelease: () => void;
}> = ({ active, onPress, onRelease }) => {
  return (
    <button
      onPointerDown={onPress}
      onPointerUp={onRelease}
      className={cx(css.white, {
        [css.active]: active,
      })}
    />
  );
};
const Black: React.FC<{
  active: boolean;
  onPress: () => void;
  onRelease: () => void;
}> = ({ active, onPress, onRelease }) => {
  return (
    <button
      onPointerDown={onPress}
      onPointerUp={onRelease}
      className={cx(css.black, {
        [css.active]: active,
      })}
    />
  );
};

export const Keyboard: React.FC<{
  onMIDIEvent: (event: MIDIEvent) => void;
}> = ({ onMIDIEvent }) => {
  const octave = useRef<number>(4);
  const velocity = useRef<number>(30);
  const refActiveKeys = useRef<KeyboardNoteKey[]>([]);
  const [activeKeys, setActiveKeys] = useState<KeyboardNoteKey[]>([]);

  const handleKeyboardNoteDown = (key: KeyboardNoteKey) => {
    const note = parseKeyboardKey(key, octave.current);
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
  const handleKeyboardNoteUp = (key: KeyboardNoteKey) => {
    const note = parseKeyboardKey(key, octave.current);
    if (!note) {
      return;
    }
    const pitch = Tone.Frequency(note).toMidi();
    if (refActiveKeys.current.includes(key)) {
      refActiveKeys.current = refActiveKeys.current.filter(
        (activeKey) => activeKey !== key
      );
      setActiveKeys(refActiveKeys.current);
      onMIDIEvent([128, pitch, velocity.current]);
    }
  };
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const key = keyCodeToNoteKeyMap.get(event.keyCode);
      if (key === "z") {
        octave.current = Math.max(-1, octave.current - 1);
        return;
      }
      if (key === "x") {
        octave.current = Math.min(9, octave.current + 1);
        return;
      }
      if (key === "c") {
        velocity.current = Math.max(1, velocity.current - 20);
        return;
      }
      if (key === "v") {
        velocity.current = Math.min(127, velocity.current + 20);
      }
      const noteKey = key as KeyboardNoteKey;
      handleKeyboardNoteDown(noteKey);
    };
    const handleKeyup = (event: KeyboardEvent) => {
      const key = keyCodeToNoteKeyMap.get(event.keyCode) as KeyboardNoteKey;
      handleKeyboardNoteUp(key);
    };
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
    };
  }, [octave, refActiveKeys, handleKeyboardNoteDown]);

  const WhiteBind: React.FC<{ keyboardKey: KeyboardNoteKey }> = ({
    keyboardKey,
  }): React.ReactElement => {
    return (
      <White
        active={activeKeys.includes(keyboardKey)}
        onPress={() => handleKeyboardNoteDown(keyboardKey)}
        onRelease={() => handleKeyboardNoteUp(keyboardKey)}
      />
    );
  };
  const BlackBind: React.FC<{ keyboardKey: KeyboardNoteKey }> = ({
    keyboardKey,
  }): React.ReactElement => {
    return (
      <Black
        active={activeKeys.includes(keyboardKey)}
        onPress={() => handleKeyboardNoteDown(keyboardKey)}
        onRelease={() => handleKeyboardNoteUp(keyboardKey)}
      />
    );
  };

  return (
    <div className={css.container}>
      <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="a" />
        <BlackBind keyboardKey="w" />
      </div>
      <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="s" />
        <BlackBind keyboardKey="e" />
      </div>
      <WhiteBind keyboardKey="d" />
      <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="f" />
        <BlackBind keyboardKey="t" />
      </div>
      <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="g" />
        <BlackBind keyboardKey="y" />
      </div>
      <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="h" />
        <BlackBind keyboardKey="u" />
      </div>
      <WhiteBind keyboardKey="j" />
      <WhiteBind keyboardKey="k" />
    </div>
  );
};