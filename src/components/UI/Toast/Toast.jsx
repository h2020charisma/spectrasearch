/* eslint-disable react/prop-types */
import * as React from "react";
import * as Toast from "@radix-ui/react-toast";
import "./Toast.css";

const ToastDemo = ({ error }) => {
  const [open, setOpen] = React.useState(false);

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
        <Toast.Root
          className="ToastRoot"
          open={open}
          onOpenChange={setOpen}
          duration={5000}
        >
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

export default ToastDemo;
