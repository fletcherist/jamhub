import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import { ZeitProvider, CssBaseline } from "@zeit-ui/react";

import { Storybook } from "./Components";
// import { Loops } from "./Sandbox";

ReactDOM.render(
  <React.StrictMode>
    <ZeitProvider>
      <CssBaseline />
      {/* <App /> */}
      <Storybook />
    </ZeitProvider>
    {/* <div style={{ height: "100vh" }}></div> */}
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
