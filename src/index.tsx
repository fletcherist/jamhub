import React from "react";
import ReactDOM from "react-dom";
import { ZeitProvider, CssBaseline } from "@zeit-ui/react";

import App from "./App";
import * as serviceWorker from "./serviceWorker";

import { Storybook } from "./Components";
import { Loops } from "./Sandbox";

ReactDOM.render(
  <React.StrictMode>
    <ZeitProvider>
      <CssBaseline />
      {/* <App /> */}
      <Loops />
      {/* <Storybook /> */}
    </ZeitProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
