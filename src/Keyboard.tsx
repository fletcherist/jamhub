import * as Tone from "tone";

import React, { useRef, useEffect, useState } from "react";
import cx from "classnames";
import css from "./Keyboard.module.css";

import { Transport } from "./transport";
import { MIDIEvent } from "./lib";

import { filter } from "rxjs/operators";
import { Subject } from "rxjs";

import { Keyboard as KeyboardDescription, Tooltip } from "@zeit-ui/react";

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

const noteToKeyboardMap = new Map<KeyboardNotePitch, KeyboardNoteKey>(
  [...keybardToNoteMap.entries()].map(([keyboardKey, note]) => [
    note, // swap map
    keyboardKey,
  ])
);

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

export const MyKeyboard: React.FC<{
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
        octave.current = Math.max(0, octave.current - 1);
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
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return; // dont trigger keyboard action when cmd/ctrl/option pressed
      }
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

  return (
    <div>
      <Keyboard
        activeKeys={activeKeys}
        onPressKey={handleKeyboardNoteDown}
        onReleaseKey={handleKeyboardNoteUp}
      />
      <div>
        <Tooltip text={"octave down"}>
          <KeyboardDescription>z</KeyboardDescription>
        </Tooltip>
        <Tooltip text={"octave up"}>
          <KeyboardDescription>x</KeyboardDescription>
        </Tooltip>
        <Tooltip text={"less velocity"}>
          <KeyboardDescription>c</KeyboardDescription>
        </Tooltip>
        <Tooltip text={"more velocity"}>
          <KeyboardDescription>v</KeyboardDescription>
        </Tooltip>
      </div>
    </div>
  );
};

interface KeyboardMIDIEvent {
  type: "press" | "release";
  key: KeyboardNoteKey;
}
export const UserKeyboardContainer: React.FC<{
  transport: Transport;
  userId: string;
}> = ({ transport, userId }) => {
  const keyboardEvents = new Subject<KeyboardMIDIEvent>();
  useEffect(() => {
    const subscription = transport.receive
      .pipe(
        filter((event) => {
          if (event.type === "midi" && event.userId === userId) {
            return true;
          }
          return false;
        })
      )
      .subscribe((event) => {
        if (event.type === "midi") {
          const [type, pitch] = event.midi;
          const toneNote = Tone.Frequency(pitch, "midi").toNote();
          const note = toneNote.slice(
            0,
            toneNote.length - 1
          ) as KeyboardNotePitch;
          const key = noteToKeyboardMap.get(note);
          if (!key) {
            throw new Error(`unexpected key ${toneNote}`);
          }
          if (type === 144) {
            keyboardEvents.next({ type: "press", key });
          } else if (type === 128) {
            keyboardEvents.next({ type: "release", key });
          }
          return;
        }
        throw new Error(`expected midi event. got: ${event.type}`);
      });
    return () => subscription.unsubscribe();
  }, [transport, userId, keyboardEvents]);

  return <UserKeyboard keyboardEvents={keyboardEvents} />;
};
export const UserKeyboard: React.FC<{
  keyboardEvents?: Subject<KeyboardMIDIEvent>;
}> = ({ keyboardEvents = new Subject<KeyboardMIDIEvent>() }) => {
  const refActiveKeys = useRef<KeyboardNoteKey[]>([]);
  const [activeKeys, setActiveKeys] = useState<KeyboardNoteKey[]>([]);
  useEffect(() => {
    const subscription = keyboardEvents.subscribe((event) => {
      if (event.type === "press") {
        if (!refActiveKeys.current.includes(event.key)) {
          refActiveKeys.current = [...refActiveKeys.current, event.key];
          setActiveKeys(refActiveKeys.current);
        }
      } else if (event.type === "release") {
        if (refActiveKeys.current.includes(event.key)) {
          refActiveKeys.current = refActiveKeys.current.filter(
            (activeKey) => activeKey !== event.key
          );
          setActiveKeys(refActiveKeys.current);
        }
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [keyboardEvents]);

  return (
    <Keyboard
      activeKeys={activeKeys}
      onPressKey={() => undefined}
      onReleaseKey={() => undefined}
    />
  );
};

export const Keyboard: React.FC<{
  activeKeys: KeyboardNoteKey[];
  onPressKey: (key: KeyboardNoteKey) => void;
  onReleaseKey: (key: KeyboardNoteKey) => void;
}> = ({ activeKeys, onPressKey, onReleaseKey }) => {
  const WhiteBind: React.FC<{ keyboardKey: KeyboardNoteKey }> = ({
    keyboardKey,
  }): React.ReactElement => {
    return (
      <White
        active={activeKeys.includes(keyboardKey)}
        onPress={() => onPressKey(keyboardKey)}
        onRelease={() => onReleaseKey(keyboardKey)}
      />
    );
  };
  const BlackBind: React.FC<{ keyboardKey: KeyboardNoteKey }> = ({
    keyboardKey,
  }): React.ReactElement => {
    return (
      <Black
        active={activeKeys.includes(keyboardKey)}
        onPress={() => onPressKey(keyboardKey)}
        onRelease={() => onReleaseKey(keyboardKey)}
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
      {/* <div className={css.whiteWithBlack}>
        <WhiteBind keyboardKey="k" />
        <BlackBind keyboardKey="o" />
      </div>
      <WhiteBind keyboardKey="l" /> */}
    </div>
  );
};
