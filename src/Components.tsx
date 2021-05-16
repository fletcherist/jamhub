import React, { useState, useEffect, useRef } from "react";
import css from "./Components.module.css";

import cx from "classnames";
import {
  Text,
  Description,
  Row,
  Spacer,
  Card,
  Button,
  Input,
  Snippet,
  Modal,
  Divider,
  Link,
  Code,
} from "@zeit-ui/react";

import { Twitter, Facebook, Chrome, Music } from "@zeit-ui/react-icons";
import { MyKeyboard, UserKeyboard } from "./Keyboard";

import {
  Sequence,
  emptySequence,
  createDrumLoop,
  startTransportSync,
} from "./Sandbox";
import { analytics } from "./analytics";
import { useAudioContext } from "./store";
import {
  Granular,
  getAudioBuffer,
  GranulaProps,
  createReverb,
  Reverb,
} from "./instruments/granula";

import { Observable } from "rxjs";
import { Transport } from "./transport";

import * as lib from "./lib";

export const Instrument: React.FC<{
  name: string;
  description: string;
  onClick: (event: React.MouseEvent) => void;
  selected: boolean;
  loading: boolean;
}> = ({ name, onClick, selected, loading = false, description }) => {
  return (
    <div
      className={cx(css.instrument, {
        [css.instrumentSelected]: selected,
        [css.instrumentLoading]: loading,
      })}
      onClick={onClick}
    >
      <div>
        <div className={css.instrumentTitle}>{name}</div>
        <div className={css.instrumentDescription}>
          {loading ? "loading..." : description}
        </div>
      </div>
    </div>
  );
};

const InstrumentStory = () => {
  const [isSelected, setIsSelected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          onChange={() => setIsSelected(!isSelected)}
          checked={isSelected}
        />
        selected
      </label>
      <label>
        <input
          type="checkbox"
          onChange={() => setIsLoading(!isLoading)}
          checked={isLoading}
        />
        loading
      </label>
      <Instrument
        name="drums"
        onClick={() => undefined}
        selected={isSelected}
        loading={isLoading}
        description="soft & ambient"
      />
    </div>
  );
};

export const InstrumentsStory = () => {
  const [selectedInstrument, setSelectedInstrument] = useState<number>(0);

  return (
    <div style={{ width: 400 }}>
      <Instrument
        name="drums"
        onClick={() => setSelectedInstrument(1)}
        selected={selectedInstrument === 1}
        loading={false}
        description="soft & ambient"
      />
      <Instrument
        name="grand piano"
        onClick={() => setSelectedInstrument(2)}
        selected={selectedInstrument === 2}
        loading={true}
        description="soft & ambient"
      />
      <Instrument
        name="drums"
        onClick={() => setSelectedInstrument(3)}
        selected={selectedInstrument === 3}
        loading={false}
        description="soft & ambient"
      />
    </div>
  );
};

export const Logo: React.FC<{
  size?: number;
}> = ({ size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="120" cy="120" r="120" fill="black" />
      <path
        d="M50 123.5C129.5 203 124 190.5 124 117C124 43.5 190.5 44.5 190.5 117"
        stroke="white"
        strokeWidth="20"
      />
    </svg>
  );
};
export const LogoWithName: React.FC<{}> = () => {
  return (
    <svg
      width="100"
      viewBox="0 0 829 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="120" cy="120" r="120" fill="black" />
      <path
        d="M66 129.688C127.676 191.585 123.409 181.853 123.409 124.628C123.409 67.4022 175 68.1808 175 124.628"
        stroke="white"
        strokeWidth="20"
      />
      <path
        d="M298.016 84.0352H335.34V158.479C335.34 163.218 334.679 167.411 333.357 171.057C332.081 174.702 330.19 177.756 327.684 180.217C325.223 182.723 322.192 184.615 318.592 185.891C315.037 187.212 310.981 187.873 306.424 187.873C303.826 187.873 301.388 187.782 299.109 187.6C296.876 187.463 294.507 187.167 292 186.711L292.889 176.32C293.663 176.457 294.643 176.571 295.828 176.662C297.013 176.799 298.198 176.89 299.383 176.936C300.613 177.027 301.775 177.072 302.869 177.072C304.008 177.118 304.897 177.141 305.535 177.141C307.905 177.141 310.138 176.822 312.234 176.184C314.331 175.591 316.154 174.566 317.703 173.107C319.253 171.649 320.46 169.712 321.326 167.297C322.238 164.927 322.693 161.988 322.693 158.479V95.041H298.016V84.0352ZM320.916 64.5527C320.916 62.502 321.531 60.7702 322.762 59.3574C323.992 57.8991 325.883 57.1699 328.436 57.1699C330.988 57.1699 332.902 57.8991 334.178 59.3574C335.454 60.7702 336.092 62.502 336.092 64.5527C336.092 66.6035 335.454 68.3353 334.178 69.748C332.902 71.1152 330.988 71.7988 328.436 71.7988C325.883 71.7988 323.992 71.1152 322.762 69.748C321.531 68.3353 320.916 66.6035 320.916 64.5527Z"
        fill="black"
      />
      <path
        d="M433.356 158C432.855 157.043 432.445 155.858 432.126 154.445C431.852 152.987 431.647 151.483 431.511 149.934C430.235 151.21 428.799 152.417 427.204 153.557C425.654 154.696 423.923 155.699 422.009 156.564C420.14 157.43 418.135 158.114 415.993 158.615C413.851 159.117 411.572 159.367 409.157 159.367C405.238 159.367 401.683 158.798 398.493 157.658C395.348 156.519 392.66 154.992 390.427 153.078C388.239 151.118 386.53 148.817 385.3 146.174C384.115 143.485 383.522 140.591 383.522 137.492C383.522 133.436 384.32 129.882 385.915 126.828C387.555 123.775 389.857 121.245 392.819 119.24C395.781 117.189 399.336 115.663 403.483 114.66C407.676 113.658 412.347 113.156 417.497 113.156H431.305V107.346C431.305 105.113 430.895 103.107 430.075 101.33C429.255 99.5527 428.093 98.0488 426.589 96.8184C425.085 95.5423 423.239 94.5625 421.052 93.8789C418.91 93.1953 416.494 92.8535 413.805 92.8535C411.299 92.8535 409.043 93.1725 407.038 93.8105C405.078 94.4486 403.415 95.2917 402.048 96.3398C400.68 97.388 399.61 98.6413 398.835 100.1C398.106 101.512 397.741 102.993 397.741 104.543H385.026C385.072 101.854 385.755 99.2109 387.077 96.6133C388.444 94.0156 390.381 91.6914 392.887 89.6406C395.44 87.5443 398.516 85.8581 402.116 84.582C405.762 83.306 409.886 82.668 414.489 82.668C418.682 82.668 422.578 83.1921 426.179 84.2402C429.779 85.2428 432.878 86.7923 435.475 88.8887C438.119 90.9395 440.192 93.5143 441.696 96.6133C443.2 99.7122 443.952 103.335 443.952 107.482V141.867C443.952 144.328 444.18 146.949 444.636 149.729C445.091 152.463 445.729 154.855 446.55 156.906V158H433.356ZM411.003 148.361C413.464 148.361 415.765 148.042 417.907 147.404C420.049 146.766 421.986 145.923 423.718 144.875C425.495 143.827 427.022 142.642 428.298 141.32C429.574 139.953 430.576 138.54 431.305 137.082V122.111H419.548C412.165 122.111 406.423 123.205 402.321 125.393C398.22 127.58 396.169 131.021 396.169 135.715C396.169 137.538 396.465 139.224 397.057 140.773C397.695 142.323 398.63 143.667 399.86 144.807C401.091 145.9 402.64 146.766 404.509 147.404C406.377 148.042 408.542 148.361 411.003 148.361Z"
        fill="black"
      />
      <path
        d="M485.845 84.0352L486.187 91.0078C487.691 88.4102 489.651 86.3822 492.066 84.9238C494.527 83.4655 497.489 82.7135 500.953 82.668C507.743 82.668 512.278 85.3112 514.556 90.5977C516.015 88.2279 517.929 86.3366 520.298 84.9238C522.714 83.4655 525.63 82.7135 529.048 82.668C534.472 82.668 538.642 84.3314 541.558 87.6582C544.475 90.985 545.933 96.0208 545.933 102.766V158H533.902V102.629C533.902 96.431 531.054 93.3548 525.357 93.4004C523.853 93.4004 522.554 93.6055 521.461 94.0156C520.367 94.4258 519.455 94.9954 518.726 95.7246C517.997 96.4082 517.427 97.2285 517.017 98.1855C516.607 99.097 516.334 100.054 516.197 101.057V158H504.166V102.561C504.166 99.5983 503.505 97.3197 502.183 95.7246C500.862 94.1296 498.765 93.3548 495.894 93.4004C493.251 93.4004 491.2 93.9245 489.742 94.9727C488.283 96.0208 487.212 97.4108 486.529 99.1426V158H474.498V84.0352H485.845Z"
        fill="black"
      />
      <path
        d="M587.963 95.041C590.607 91.1673 593.865 88.1595 597.739 86.0176C601.612 83.8301 605.965 82.7135 610.795 82.668C614.669 82.668 618.178 83.2376 621.323 84.377C624.513 85.4707 627.224 87.2025 629.457 89.5723C631.691 91.9421 633.399 94.9499 634.584 98.5957C635.815 102.196 636.43 106.48 636.43 111.447V158H623.784V111.311C623.784 105.249 622.325 100.738 619.409 97.7754C616.538 94.8132 612.413 93.3548 607.036 93.4004C602.98 93.4004 599.288 94.403 595.961 96.4082C592.68 98.3678 590.014 100.988 587.963 104.27V158H575.317V53H587.963V95.041Z"
        fill="black"
      />
      <path
        d="M718.587 147.814C716.126 151.46 713.05 154.309 709.359 156.359C705.667 158.365 701.406 159.367 696.575 159.367C692.702 159.367 689.193 158.775 686.048 157.59C682.904 156.359 680.215 154.468 677.982 151.916C675.749 149.364 674.017 146.128 672.786 142.209C671.601 138.244 671.009 133.505 671.009 127.99V84.0352H683.655V128.127C683.655 132.137 683.974 135.464 684.612 138.107C685.251 140.751 686.208 142.87 687.484 144.465C688.76 146.014 690.309 147.108 692.132 147.746C694.001 148.384 696.142 148.703 698.558 148.703C703.708 148.703 707.855 147.655 710.999 145.559C714.189 143.462 716.559 140.637 718.109 137.082V84.0352H730.823V158H719.339L718.587 147.814Z"
        fill="black"
      />
      <path
        d="M828.566 121.838C828.566 127.124 827.928 132.069 826.652 136.672C825.376 141.229 823.508 145.194 821.047 148.566C818.586 151.939 815.533 154.582 811.887 156.496C808.286 158.41 804.139 159.367 799.445 159.367C794.706 159.367 790.581 158.524 787.072 156.838C783.609 155.152 780.646 152.736 778.186 149.592L777.57 158H765.949V53H778.596V91.9648C781.011 88.957 783.928 86.6556 787.346 85.0605C790.764 83.4655 794.751 82.668 799.309 82.668C804.048 82.668 808.241 83.6022 811.887 85.4707C815.533 87.3392 818.586 89.9368 821.047 93.2637C823.508 96.5905 825.376 100.578 826.652 105.227C827.928 109.829 828.566 114.888 828.566 120.402V121.838ZM815.92 120.402C815.92 116.802 815.555 113.384 814.826 110.148C814.143 106.867 813.026 103.996 811.477 101.535C809.927 99.0286 807.899 97.0462 805.393 95.5879C802.886 94.1296 799.81 93.4004 796.164 93.4004C793.977 93.4004 791.971 93.6966 790.148 94.2891C788.326 94.8359 786.685 95.6335 785.227 96.6816C783.814 97.6842 782.538 98.8919 781.398 100.305C780.305 101.672 779.37 103.176 778.596 104.816V137.15C779.416 138.791 780.373 140.318 781.467 141.73C782.606 143.098 783.905 144.305 785.363 145.354C786.822 146.402 788.462 147.222 790.285 147.814C792.108 148.361 794.113 148.635 796.301 148.635C799.764 148.635 802.727 147.928 805.188 146.516C807.694 145.057 809.722 143.098 811.271 140.637C812.867 138.176 814.029 135.327 814.758 132.092C815.533 128.856 815.92 125.438 815.92 121.838V120.402Z"
        fill="black"
      />
    </svg>
  );
};

export const Granula: React.FC<{
  url: string;
  onChange: (state: GranulaState) => void;
  setLoading: (loading: boolean) => void;
  state: GranulaState;
  loading: boolean;
}> = ({ url, state, onChange, loading = true, setLoading }) => {
  const audioContext = useAudioContext();
  const [buffer, setBuffer] = useState<AudioBuffer>();
  const reverb = useRef<Reverb>();

  const update = (partial: Partial<GranulaState>) =>
    onChange({ ...state, ...partial });
  const updateAdsr = (partial: Partial<GranulaProps["controls"]["adsr"]>) =>
    update({ adsr: { ...state.adsr, ...partial } });

  useEffect(() => {
    const getFile = async () => {
      setLoading(true);
      reverb.current = await createReverb(audioContext);
      reverb.current.output.connect(audioContext.destination);

      const audioBuffer = await getAudioBuffer(
        audioContext,
        // "https://fletcherist.github.io/jamlib/kalimba/c4.mp3"
        // "https://ruebel.github.io/granular/audio/test.mp3"
        // "https://www.soundjay.com/nature/river-6.mp3"
        url
      );
      console.log("audio buffer fetched", audioBuffer);
      setBuffer(audioBuffer);
      setLoading(false);
    };
    getFile();
  }, [audioContext, url]);

  return (
    <div style={{ display: "flex" }}>
      <div style={{ width: "300px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <Text
            span
            size={13}
            b
            style={{ textAlign: "right", padding: "0.5rem" }}
          >
            {loading ? "loading..." : "atmosphere"}
          </Text>
          <Button
            size="mini"
            disabled={loading}
            onClick={() => update({ running: !state.running })}
          >
            {state.running ? "stop" : "start"}
          </Button>
        </div>
        <GranulaParameter
          label="reverb"
          min={0}
          max={1}
          step={0.01}
          value={state.reverb}
          disabled={loading}
          onChange={(value) => {
            update({ reverb: value });
            if (reverb.current) {
              reverb.current.setWet(value);
            }
          }}
        />

        <GranulaParameter
          label="attack"
          min={10}
          max={300}
          step={1}
          value={state.adsr.attack}
          disabled={loading}
          onChange={(value) => {
            updateAdsr({ attack: value });
          }}
        />
        <GranulaParameter
          label="sustain"
          min={10}
          max={100}
          step={1}
          value={state.adsr.sustain}
          disabled={loading}
          onChange={(value) => {
            updateAdsr({ sustain: value });
          }}
        />
        <GranulaParameter
          label="release"
          min={10}
          max={300}
          step={1}
          value={state.adsr.release}
          disabled={loading}
          onChange={(value) => {
            updateAdsr({ release: value });
          }}
        />
        <GranulaParameter
          label="spread"
          min={0}
          max={2}
          step={0.1}
          value={state.spread}
          disabled={loading}
          onChange={(value) => {
            update({ spread: value });
          }}
        />
        <GranulaParameter
          label="density"
          min={10}
          max={400}
          step={1}
          value={state.density}
          disabled={loading}
          onChange={(value) => {
            update({ density: value });
          }}
        />
        <GranulaParameter
          label="fragment"
          min={0}
          max={1}
          step={0.01}
          value={state.position}
          disabled={loading}
          onChange={(value) => {
            update({ position: value });
          }}
        />
        <GranulaParameter
          label="pitch"
          min={0}
          max={10}
          step={1}
          value={state.transpose}
          disabled={loading}
          onChange={(value) => {
            update({ transpose: value });
          }}
        />
        <GranulaParameter
          label="gain"
          min={0}
          max={1}
          step={0.1}
          value={state.gain}
          disabled={loading}
          onChange={(value) => {
            update({ gain: value });
          }}
        />
        {buffer && reverb.current && state.running && (
          <Granular
            audioContext={audioContext}
            buffer={buffer}
            output={reverb.current.input}
            controls={state}
          />
        )}
      </div>
      {/* <Code block width="50%">
        {JSON.stringify(state, null, 2)}
      </Code> */}
    </div>
  );
};

export const GranulaParameter: React.FC<{
  min: number;
  max: number;
  step: number;
  value: number;
  label: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}> = ({ min, max, step, onChange, value, label, disabled = false }) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Text
        span
        type="secondary"
        size={11}
        style={{ padding: 5, minWidth: 60, textAlign: "right" }}
      >
        {label}
      </Text>
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        <input
          style={{ width: "100%" }}
          type="range"
          step={step}
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(Number(event.target.value));
          }}
        />
      </div>
    </div>
  );
};

type GranulaState = GranulaProps["controls"];
export const granulaDefaultState: GranulaState = {
  running: false,
  adsr: {
    attack: 100, // [10, 100]
    sustain: 100, // [10, 200]
    release: 100, // [10, 100]
    // decay: 0,
  },
  transpose: 0,
  density: 20, // [10, 4000]
  // gain: 0.3,
  pan: 0.01,
  gain: 0.1,
  playbackRate: 1, // [0, 2]
  position: 0.57,
  spread: 0.4, // [0, 2]
  reverb: 0.5,
};

export const GranulaController: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [state, setState] = useState<GranulaState>(granulaDefaultState);
  return (
    <Granula
      loading={loading}
      setLoading={setLoading}
      state={state}
      onChange={(newState) => setState(newState)}
      url="https://ruebel.github.io/granular/audio/test.mp3"
    />
  );
};

export const GranulaTransportController: React.FC<{
  transport: Transport;
  sync: Observable<lib.TransportEvent>;
}> = ({ transport, sync }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [state, setState] = useState<GranulaState>(granulaDefaultState);

  useEffect(() => {
    const subscription = sync.subscribe((event) => {
      // console.log("received sync:", event);
      if (event.type === "sync") {
        setState(JSON.parse(event.state) as GranulaState);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [sync]);

  return (
    <Granula
      loading={loading}
      setLoading={setLoading}
      state={state}
      onChange={(newState) => {
        setState(newState);
        // console.log("sync", { type: "sync", state: newState });
        transport.send({ type: "sync", state: JSON.stringify(newState) });
      }}
      url="https://ruebel.github.io/granular/audio/test.mp3"
    />
  );
};

export const Storybook: React.FC = () => {
  return (
    <div>
      {/* <PopupUseChrome />
      <PopupWelcomeToSession /> */}
      <div style={{ maxWidth: 600 }}>
        {/* <GranularStory url="https://www.soundjay.com/nature/campfire-1.mp3" /> */}
        <GranulaController />
        {/* <GranularStory url="https://www.soundjay.com/nature/river-6.mp3" /> */}
      </div>

      {/* <GranularStory /> */}
      <div>
        <Logo />
        <LogoWithName />
      </div>
      <InstrumentStory />
      <Divider />
      <InstrumentsStory />
      <Divider />

      <GranulaParameter
        label="attack"
        min={1}
        max={100}
        step={5}
        onChange={() => undefined}
        value={50}
      />
      <GranulaParameter
        label="attack"
        min={1}
        max={100}
        step={5}
        onChange={() => undefined}
        value={50}
      />

      {/* <UserStory /> */}
      {/* <InstrumentsListStory /> */}
      {/* <Row style={{ padding: "10px 0" }}>
        <Loading />
      </Row> */}
      <UserKeyboard />
      <Center>
        <div>
          <Card shadow>
            <Row>
              <div style={{ height: 166 }}>
                <Description title="Instruments" />
                <Instrument
                  name="epiano"
                  onClick={() => undefined}
                  selected={false}
                  loading={false}
                  description="soft & ambient"
                />
                <Instrument
                  name="guitar"
                  onClick={() => undefined}
                  selected={true}
                  loading={false}
                  description="soft & ambient"
                />
                <Instrument
                  name="piano"
                  onClick={() => undefined}
                  selected={false}
                  loading={true}
                  description="soft & ambient"
                />
                <Spacer y={0.5} />
              </div>
              <Spacer x={1} />
              <div>
                <MyKeyboard onMIDIEvent={() => undefined} />
              </div>
            </Row>
          </Card>
        </div>
      </Center>
      <Sequencer />
    </div>
  );
};

type CellStatus = "playing" | "queued" | "stopped";
const Cell: React.FC<{
  status: CellStatus;
  onClick: (event: React.MouseEvent) => void;
}> = ({ status, onClick }) => {
  return (
    <div className={css.cell} style={{}} onClick={onClick}>
      <svg width="32px" height="32px" viewBox="0 0 32 32">
        <defs />
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g fill="#FFFFFF">
            {status === "playing" ? (
              <rect x="0" y="0" width="32" height="32" />
            ) : (
              <polygon id="Path" points="3 0 31 16 3 32" />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};

export const CellContainer: React.FC<{
  sequence: Sequence;
}> = ({ sequence }) => {
  const [status, setStatus] = useState<CellStatus>("stopped");
  return (
    <Cell
      status={status}
      onClick={() => {
        startTransportSync();
        if (status === "playing") {
          setStatus("stopped");
          sequence.stop();
        } else if (status === "stopped") {
          setStatus("playing");
          sequence.start();
        }
      }}
    />
  );
};

const drumLoop = createDrumLoop();

export const Sequencer = () => {
  const gap = 0.1;
  return (
    <div className={css.cells}>
      <div>
        <div className={css.cellLabel}>drums</div>
        <CellContainer sequence={drumLoop} />
        <Spacer y={gap} />
        <CellContainer sequence={emptySequence} />
        <Spacer y={gap} />
        <CellContainer sequence={emptySequence} />
      </div>
      <Spacer x={gap} />
      <div>
        <div className={css.cellLabel}>wavetable</div>
        <CellContainer sequence={emptySequence} />
        <Spacer y={gap} />
        <CellContainer sequence={emptySequence} />
        <Spacer y={gap} />
        <CellContainer sequence={emptySequence} />
      </div>
    </div>
  );
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

export const PopupUseChrome: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const isChrome = (): boolean =>
      navigator.userAgent.toLowerCase().includes("chrome");
    console.log("isChrome", isChrome);
    if (!isChrome()) {
      setIsOpen(true);
    }
  }, []);
  return (
    <Modal open={isOpen} onClose={() => setIsOpen(false)}>
      <Modal.Title>Sorry!</Modal.Title>
      <Modal.Subtitle>Your browser is not supported</Modal.Subtitle>
      <Modal.Content>
        <p style={{ textAlign: "center" }}>
          Some features may not work.
          <br /> Please use Google Chrome
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link color href="https://www.google.com/chrome/">
            <Chrome size={64} />
          </Link>
        </div>
      </Modal.Content>
      <Modal.Action passive onClick={() => setIsOpen(false)}>
        Okay
      </Modal.Action>
    </Modal>
  );
};
export const PopupWelcomeToSession: React.FC = () => {
  const audioContext = useAudioContext();
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    setIsOpen(false);
  };
  useEffect(() => {
    open();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, audioContext]);
  return (
    <Modal
      open={isOpen}
      onClose={() => {
        close();
      }}
    >
      <Modal.Title>Hello!</Modal.Title>
      <Modal.Content>
        <p style={{ textAlign: "center" }}>
          <div>
            <b>Welcome to jam session</b>
          </div>
          <div>
            <b>1.</b> Turn on your headphones
          </div>
          <div>
            <b>2.</b> Press any key to continue
          </div>
          <div style={{ paddingTop: "2rem" }}>
            <Music size={64} />
          </div>
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}></div>
      </Modal.Content>
      <Modal.Action passive onClick={() => close()}>
        Join
      </Modal.Action>
    </Modal>
  );
};

export const CopyLink: React.FC<{
  url: string;
}> = ({ url }) => {
  return (
    <Snippet
      onClick={() => {
        analytics.app.shareLink();
      }}
      type="dark"
      text={url}
      width="100%"
    />
  );
};

const CreateLink: React.FC = () => {
  const [path, setPath] = useState<string>("");
  const url = `https://jamhub.netlify.app/${path}`;
  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text b>Create and share the link with friends</Text>
      <Spacer y={0.5} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          console.log("submit");
          window.open(url);
        }}
      >
        <Input
          autoFocus
          onChange={(event) => {
            setPath(event.target.value);
          }}
          value={path}
          label="jamhub.netlify.app/"
          size="large"
          placeholder="e.g. tiny-clouds"
          clearable
          width="100%"
        />{" "}
        <Spacer y={0.5} />
        <CopyLink url={url} />
        <Spacer y={1} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            analytics.app.createRoom();
          }}
        >
          <Button size="small" disabled={path.length === 0}>
            Go Live
          </Button>
        </a>
      </form>
    </div>
  );
};

const SocialButtons = () => {
  return (
    <div className={css.socialIcons}>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURI(
          `https://jamhub.netlify.app/ tool for online music collaboration`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          analytics.app.clickSocial("twitter");
        }}
      >
        <div className={css.socialIcon}>
          <Twitter />
        </div>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(
          `https://jamhub.netlify.app/ tool for online music collaboration`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          analytics.app.clickSocial("facebook");
        }}
      >
        <div className={css.socialIcon}>
          <Facebook />
        </div>
      </a>
    </div>
  );
};

export const Landing: React.FC = () => {
  useEffect(() => {
    analytics.pageview();
  }, []);
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: 400 }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <LogoWithName />
          </div>

          <Text h2>Jam with friends online</Text>
          <Text p>
            tool for online music collaboration. <b>midi</b> support.
            <br />
            <b>low-latency</b>. good-sound instruments & drums. <b>free</b>
          </Text>
        </div>

        <Spacer y={1} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div>
            <Card shadow>
              <CreateLink />
            </Card>
            <Spacer y={1} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SocialButtons />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
