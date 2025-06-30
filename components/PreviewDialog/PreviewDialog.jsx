/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../store/store";
import Chart from "../Chart/Chart";
import PreviewIcon from "../Icons/PreviewIcon";

import Close from "../Icons/Close";
import "./PreviewDialog.css";

export default function PreviewDialog({ img }) {
  const [open, setOpen] = useState(false);
  const imageSelectedStore = useStore((state) => state.imageSelected);
  const tableView = useStore((state) => state.tableView);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {tableView ? (
          <button
            data-cy="preferences-btn"
            id="preferences"
            className="exploreH5web"
          >
            <PreviewIcon />
          </button>
        ) : (
          <button
            data-cy="preferences-btn"
            id="preferences"
            className="exploreH5web"
          >
            Preview
          </button>
        )}
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay className="DialogOverlay" />
            <Dialog.Content asChild className="PreviewDialogContent">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: "0%" }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ duration: 0.16, ease: "easeInOut" }}
              >
                <div className="DialogHeader">
                  <Dialog.Title className="DialogTitle">Preview</Dialog.Title>

                  <Dialog.Close asChild>
                    <div data-cy="ok-btn" id="okBtn" className="closeBtn">
                      <Close />
                    </div>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="DialogDescription">
                  <Chart
                    imageSelected={img || imageSelectedStore}
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
