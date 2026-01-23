/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import Close from "../Icons/Close";
import { useState } from "react";
import "./EditorDialog.css";
import ComposerAndViewer from "../ComposerAndViewer/composerAndViewer";
import { MdEdit } from "react-icons/md";

export default function EditorDialog({ onSmilesExport, onMolExport }) {
  const [dialog, setDialog] = useState(false);

  const handleDialogClose = (open) => {
    if (!open && onSmilesExport) {
      // Dialog is closing, get SMILES from sessionStorage and pass to parent
      const smiles = sessionStorage.getItem("SMILES") || "";
      if (smiles) {
        onSmilesExport(smiles);
      }
    }
    setDialog(open);
  };

  return (
    <Dialog.Root open={dialog} onOpenChange={handleDialogClose} modal={false}>
      <Dialog.Trigger asChild>
        <button data-cy="" id="sources" className="fileNameBtn">
          Molecule
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* <Dialog.Overlay className="DialogOverlay" /> */}
        <Dialog.Content
          className="SourcesDialogContent"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          <div className="DialogHeader">
            <Dialog.Title className="DialogTitle">
              Drawing Molecule
            </Dialog.Title>
            <Dialog.Close asChild>
              <div
                data-cy="ok-btn"
                id="okBtn"
                className="closeBtnSourcesDialog"
              >
                <Close />
              </div>
            </Dialog.Close>
          </div>
          {/* <Dialog.Description className="DialogDescription">
            Editor
            <br />
          </Dialog.Description> */}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              height: "100%",
              marginTop: "10px",
            }}
          >
            <ComposerAndViewer onSmilesExport={onSmilesExport} onMolExport={onMolExport} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
