import * as Lib from "./lib";

import ReactGA from "react-ga";
ReactGA.initialize("UA-168064655-1");

const EVENT_SWITCH_INSTRUMENT = "switchInstrument";
const EVENT_CLICK_SOCIAL = "clickSocial";
const EVENT_SHARE_LINK = "shareLink";
const EVENT_CREATE_ROOM = "createRoom";

export const analytics = {
  pageview: () => {
    ReactGA.pageview(window.location.pathname + window.location.search);
  },
  app: {
    [EVENT_SWITCH_INSTRUMENT]: (instrument: Lib.Instrument): void => {
      ReactGA.event({
        action: `${EVENT_SWITCH_INSTRUMENT} ${instrument}`,
        category: "app",
      });
    },
    [EVENT_CLICK_SOCIAL]: (type: "twitter" | "facebook"): void => {
      ReactGA.event({
        action: `${EVENT_CLICK_SOCIAL} ${type}`,
        category: "app",
      });
    },
    [EVENT_SHARE_LINK]: (): void => {
      ReactGA.event({
        action: `${EVENT_SHARE_LINK}`,
        category: "app",
      });
    },
    [EVENT_CREATE_ROOM]: (): void => {
      ReactGA.event({
        action: EVENT_CREATE_ROOM,
        category: "app",
      });
    },
  },
};
