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
  name: Lib.Instrument;
  onClick: (event: React.MouseEvent) => void;
  selected: boolean;
  loaded: boolean;
}> = ({ name, onClick, selected, loaded = false }) => {
  return (
    <div
      style={{ opacity: !loaded ? 0.6 : 1 }}
      className={cx({
        [css.instrumentSelected]: selected,
      })}
      onClick={onClick}
    >
      <Text span>{name}</Text>
    </div>
  );
};
export const Storybook: React.FC = () => {
  return (
    <div>
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
                  loaded={false}
                />
                <Instrument
                  name="guitar"
                  onClick={() => undefined}
                  selected={true}
                  loaded={false}
                />
                <Instrument
                  name="piano"
                  onClick={() => undefined}
                  selected={false}
                  loaded={true}
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
      <Input
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

        <Spacer y={1} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div>
            <Card shadow>
              <CreateLink />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
