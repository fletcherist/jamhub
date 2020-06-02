import React, { useRef, useContext } from "react";
import ReactDOM from "react-dom";

import "audioworklet-polyfill";
import { ZeitProvider, CssBaseline } from "@zeit-ui/react";

import App from "./App";
import * as serviceWorker from "./serviceWorker";

import { Storybook, Landing, PopupUseChrome } from "./Components";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import { AudioContextProvider } from "./store";

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/">
          <Landing />
        </Route>
        <Route exact path="/sandbox">
          <Storybook />
        </Route>
        <Route path="/:roomId">
          <App />
        </Route>
      </Switch>
    </BrowserRouter>
  );
};

ReactDOM.render(
  <AudioContextProvider>
    <React.StrictMode>
      <ZeitProvider>
        <CssBaseline />
        <Routes />
        <PopupUseChrome />
      </ZeitProvider>
    </React.StrictMode>
  </AudioContextProvider>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
