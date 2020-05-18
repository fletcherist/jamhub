import React from "react";
import css from "./Components.module.css";

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
} from "@zeit-ui/react";

import { MyKeyboard } from "./Keyboard";

export const Storybook: React.FC = () => {
  return (
    <div>
      {/* <UserStory /> */}
      {/* <InstrumentsListStory /> */}
      {/* <Row style={{ padding: "10px 0" }}>
        <Loading />
      </Row> */}
      <Center>
        <div>
          <Row>
            <Card style={{ height: 166 }}>
              <Tree initialExpand>
                <Tree.Folder name="instruments">
                  <Tree.File name="marimba" />
                  <Tree.File
                    name="electronic piano"
                    className={css.instrumentSelected}
                  />
                  <Tree.File name="grand piano" extra="30mb loading..." />
                </Tree.Folder>
              </Tree>
              <Spacer y={0.5} />
            </Card>
            <Spacer x={1} />
            <div
            // style={{ padding: "0px 50px" }}
            >
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

const InstrumentsListStory = () => {
  return (
    <div>
      <InstrumentsList />
    </div>
  );
};
const InstrumentsList = () => {
  return (
    <div>
      {/* <Description title="Instruments" content="Select you insrument" /> */}

      {/* <Radio.Group value="1" onChange={(val) => console.log(val)}>
        <Radio value="1">
          Grand
          <Radio.Description>
            <Row style={{ padding: "10px 0" }}>
              <Loading>loading</Loading>
            </Row>
          </Radio.Description>
        </Radio>
        <Radio value="2">
          Option 2<Radio.Desc>for Option2</Radio.Desc>
        </Radio>
      </Radio.Group> */}
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
