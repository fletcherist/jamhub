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
} from "@zeit-ui/react";

import { MyKeyboard, UserKeyboard } from "./Keyboard";
import * as Lib from "./lib";

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
          {/* <JoinDiscordLink /> */}
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

export const CellContainer = () => {
  const [status, setStatus] = useState<CellStatus>("stopped");
  return (
    <Cell
      status={status}
      onClick={() => {
        if (status === "playing") {
          setStatus("stopped");
        } else if (status === "stopped") {
          setStatus("playing");
        }
      }}
    />
  );
};

export const Sequencer = () => {
  const gap = 0.2;
  return (
    <div className={css.cells}>
      <div className={css.cellColumn}>
        <div>Drums</div>
        <Cell status="playing" onClick={() => undefined} />
        <Spacer y={gap} />
        <Cell status="queued" onClick={() => undefined} />
        <Spacer y={gap} />
        <CellContainer />
      </div>
      <Spacer x={gap} />
      <div className={css.cellColumn}>
        <div>Drums</div>
        <Cell status="playing" onClick={() => undefined} />
        <Spacer y={gap} />
        <Cell status="queued" onClick={() => undefined} />
        <Spacer y={gap} />
        <CellContainer />
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
