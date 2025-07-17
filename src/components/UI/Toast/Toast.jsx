import * as Toast from "@radix-ui/react-toast";
import { useState } from "react";

export default function ToastComp() {
  const [open, setOpen] = useState(true);

  return (
    <Toast.Provider>
      <Toast.Root open={open} onOpenChange={setOpen}>
        <Toast.Title className="ToastTitle">Toast Notification</Toast.Title>
        <Toast.Description>
          This is a toast message. It can be used to display notifications or
          alerts.
        </Toast.Description>
        <Toast.Action />
        <Toast.Close />
      </Toast.Root>
    </Toast.Provider>
  );
}
