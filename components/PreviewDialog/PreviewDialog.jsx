import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useImageStore } from "../../store/store";
import Chart from "../Chart/Chart";

import Close from "../Icons/Close";
import "./PreviewDialog.css";

export default function PreviewDialog() {
  const [open, setOpen] = useState(false);
  const imageSelectedStore = useImageStore((state) => state.imageSelected);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          data-cy="preferences-btn"
          id="preferences"
          className="exploreH5web"
        >
          Preview
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay className="DialogOverlay" />
            <Dialog.Content asChild className="DialogContent">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: "0%" }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ duration: 0.16, ease: "easeInOut" }}
              >
                <div className="DialogHeader">
                  <Dialog.Title className="DialogTitle">Preview</Dialog.Title>

                  <Dialog.Close asChild>
                    <button
                      data-cy="ok-btn"
                      id="okBtn"
                      className="close-button"
                    >
                      <Close />
                    </button>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="DialogDescription">
                  <Chart
                    imageSelected={imageSelectedStore}
                    setDomain=""
                    isNexusFile={false}
                  />
                </Dialog.Description>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
