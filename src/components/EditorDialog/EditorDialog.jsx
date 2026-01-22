/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import Close from "../Icons/Close";
import { useState } from "react";
import "./EditorDialog.css";
import ComposerAndViewer from "../ComposerAndViewer/composerAndViewer";
import { MdEdit } from "react-icons/md";

export default function EditorDialog() {
  const [dialog, setDialog] = useState(false);

  return (
    <Dialog.Root open={dialog} onOpenChange={setDialog}>
      <Dialog.Trigger asChild>
        <button data-cy="" id="sources" className="fileNameBtn">
          Edit
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="SourcesDialogContent">
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
              marginTop: 25,
              justifyContent: "flex-start",
            }}
          >
            <ComposerAndViewer />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
