import React from "react";
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
} from "@zeit-ui/react";

import { MyKeyboard, UserKeyboard } from "./Keyboard";
import * as Lib from "./lib";

export const Instrument: React.FC<{
  name: Lib.Instrument;
  onClick: (event: React.MouseEvent) => void;
  selected: boolean;
}> = ({ name, onClick, selected }) => {
  return (
    <Button
      // className={cx({
      //   [css.instrumentSelected]: selected,
      // })}
      shadow={selected}
      onClick={onClick}
    >
      {name}
    </Button>
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
                <ButtonGroup vertical style={{ width: 150 }}>
                  <Instrument
                    name="epiano"
                    onClick={() => undefined}
                    selected={false}
                  />
                  <Instrument
                    name="guitar"
                    onClick={() => undefined}
                    selected={true}
                  />
                  <Instrument
                    name="piano"
                    onClick={() => undefined}
                    selected={false}
                  />
                </ButtonGroup>
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
