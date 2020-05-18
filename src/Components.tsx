import React from "react";
import css from "./Components.module.css";

import cx from "classnames";
import {
  Dot,
  Text,
  Radio,
  Description,
  Keyboard,
  Tooltip,
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
import { Instrument } from "./lib";

export const Storybook: React.FC = () => {
  const Instrument: React.FC<{
    name: Instrument;
    onClick: (event: React.MouseEvent) => void;
    selected: boolean;
  }> = ({ name, onClick, selected }) => {
    return (
      <Button
        className={cx({
          [css.instrumentSelected]: selected,
        })}
        onClick={onClick}
      >
        {name}
      </Button>
    );
  };

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
                    selected={false}
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
                <User ping={80} />
                <MyKeyboard onMIDIEvent={() => undefined} />
                <div>
                  <Tooltip text={"octave down"}>
                    <Keyboard>z</Keyboard>
                  </Tooltip>
                  <Tooltip text={"octave up"}>
                    <Keyboard>x</Keyboard>
                  </Tooltip>
                  <Tooltip text={"less velocity"}>
                    <Keyboard>c</Keyboard>
                  </Tooltip>
                  <Tooltip text={"more velocity"}>
                    <Keyboard>v</Keyboard>
                  </Tooltip>
                </div>
              </div>
            </Row>
          </Card>
          <Text>
            Join our{" "}
            <Link href="https://discord.gg/upa4tP" icon color target="_blank">
              Discord
            </Link>
            community of musicians
          </Text>
        </div>
      </Center>
    </div>
  );
};

const UserStory = () => {
  return (
    <div>
      user
      <User ping={80} />
    </div>
  );
};

const User: React.FC<{
  ping: number;
}> = ({ ping }) => {
  return (
    <div>
      <Text h6>
        {ping}ms
        <Dot style={{ marginLeft: 5 }} type="success" />
      </Text>
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
