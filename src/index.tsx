import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

import { Keyboard, Center } from "./Keyboard";

ReactDOM.render(
  <React.StrictMode>
    <div style={{ height: "100vh" }}>
      <Center>
        <Keyboard
          onMIDIEvent={(event) => {
            console.log(event);
          }}
        />
      </Center>
    </div>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
