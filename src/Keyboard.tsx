import React from "react";
import css from "./Keyboard.module.css";

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

const WhiteWithBlack = () => {
  return (
    <div className={css.whiteWithBlack}>
      <button className={css.white} />
      <button className={css.black} />
    </div>
  );
};
const White = () => {
  return <div className={css.white} />;
};

export const Keyboard: React.FC = () => {
  const keys = [1, 1, 0, 1, 1, 1, 0]; // 1 for white with black, 0 only for white
  const renderKeys = () => {
    return keys.map((key) => {
      if (key === 1) {
        return <WhiteWithBlack />;
      }
      if (key === 0) {
        return <White />;
      }
    });
  };
  return <div className={css.container}>{renderKeys()}</div>;
};
