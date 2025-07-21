/* eslint-disable react/prop-types */
import * as React from "react";
import * as Toast from "@radix-ui/react-toast";
import "./Toast.css";

const ToastDemo = ({ error }) => {
  const [open, setOpen] = React.useState(true);
  // const eventDateRef = React.useRef(new Date());
  // const timerRef = React.useRef(0);

  React.useEffect(() => {
    if (error) {
      setOpen(true);
    } else {
      setOpen(false);
    }

    return () => {};
  }, [error]);

  return (
    <div className="ToastWrapper">
      <Toast.Provider swipeDirection="right">
        {/* <button
          className="Button large violet"
          onClick={() => {
            setOpen(false);
            window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => {
              eventDateRef.current = oneWeekAway();
              setOpen(true);
            }, 100);
          }}
        >
          Add to calendar
        </button> */}

        <Toast.Root className="ToastRoot" open={open} onOpenChange={setOpen}>
          <Toast.Title className="ToastTitle">{error}</Toast.Title>
          <Toast.Description asChild></Toast.Description>
          <Toast.Action
            className="ToastAction"
            asChild
            altText="Goto schedule to undo"
          >
            <button className="Button small green">Dismiss</button>
          </Toast.Action>
        </Toast.Root>
        <Toast.Viewport className="ToastViewport" />
      </Toast.Provider>
    </div>
  );
};

// function oneWeekAway(date) {
//   const now = new Date();
//   const inOneWeek = now.setDate(now.getDate() + 7);
//   return new Date(inOneWeek);
// }

// function prettyDate(date) {
//   return new Intl.DateTimeFormat("en-US", {
//     dateStyle: "full",
//     timeStyle: "short",
//   }).format(date);
// }

export default ToastDemo;
