import React from "react";
import ReactDOM from "react-dom";

import "audioworklet-polyfill";
import { ZeitProvider, CssBaseline } from "@zeit-ui/react";

import App from "./App";
import * as serviceWorker from "./serviceWorker";

import { Storybook, Landing, PleaseUseGoogleChrome } from "./Components";
import { BrowserRouter, Switch, Route } from "react-router-dom";

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
  <React.StrictMode>
    <ZeitProvider>
      <CssBaseline />
      <Routes />
      <PleaseUseGoogleChrome />
    </ZeitProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
