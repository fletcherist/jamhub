import React, { useState } from "react";
import css from "./Components.module.css";

import cx from "classnames";
import {
  Dot,
  Text,
  Radio,
  Description,
  Row,
  Loading,
  Tree,
  Col,
  Link,
  Spacer,
  Card,
  Button,
  ButtonGroup,
  Spinner,
  Input,
  Snippet,
  Modal,
  Divider,
} from "@zeit-ui/react";

import { Twitter, Facebook } from "@zeit-ui/react-icons";

import { MyKeyboard, UserKeyboard } from "./Keyboard";
import * as Lib from "./lib";
import {
  Sequence,
  emptySequence,
  createDrumLoop,
  startTransportSync,
} from "./Sandbox";

export const Instrument: React.FC<{
  name: string;
  onClick: (event: React.MouseEvent) => void;
  selected: boolean;
  loading: boolean;
}> = ({ name, onClick, selected, loading = false }) => {
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
          {/* {!loaded && "loading..."} */}
          soft & ambient
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
      />
      <Instrument
        name="grand piano"
        onClick={() => setSelectedInstrument(2)}
        selected={selectedInstrument === 2}
        loading={true}
      />
      <Instrument
        name="drums"
        onClick={() => setSelectedInstrument(3)}
        selected={selectedInstrument === 3}
        loading={false}
      />
    </div>
  );
};
export const Storybook: React.FC = () => {
  return (
    <div>
      <InstrumentStory />
      <Divider />
      <InstrumentsStory />
      <Divider />

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
                />
                <Instrument
                  name="guitar"
                  onClick={() => undefined}
                  selected={true}
                  loading={false}
                />
                <Instrument
                  name="piano"
                  onClick={() => undefined}
                  selected={false}
                  loading={true}
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
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
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

const PleaseUseGoogleChrome: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <Button auto onClick={() => setIsOpen(true)}>
        Show Modal
      </Button>
      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <Modal.Title>Modal</Modal.Title>
        <Modal.Subtitle>This is a modal</Modal.Subtitle>
        <Modal.Content>
          <p>Some content contained within the modal.</p>
        </Modal.Content>
        <Modal.Action passive>Cancel</Modal.Action>
        <Modal.Action>Submit</Modal.Action>
      </Modal>
    </div>
  );
};

const CreateLink: React.FC = () => {
  const [path, setPath] = useState<string>("");
  const url = `https://jamhub.io/${path}`;
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
          label="jamhub.io/"
          size="large"
          placeholder="e.g. tiny-clouds"
          clearable
          width="100%"
        />{" "}
        <Spacer y={0.5} />
        <Snippet type="dark" text={url} width="100%" />
        <Spacer y={1} />
        <a href={url} target="_blank" rel="noopener noreferrer">
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
          `https://jamhub.io/ tool for online music collaboration`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className={css.socialIcon}>
          <Twitter />
        </div>
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURI(
          `https://jamhub.io/ tool for online music collaboration`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className={css.socialIcon}>
          <Facebook />
        </div>
      </a>
    </div>
  );
};

export const Landing: React.FC = () => {
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
