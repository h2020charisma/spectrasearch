import * as Dialog from "@radix-ui/react-dialog";
import Select from "../Select/Select";
import { useStore } from "../../store/store";
import "./SourcesDialog.css";

export default function SourcesDialog() {
  const source = useStore((state) => state.source);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button data-cy="preferences-btn" id="preferences" className="shareBtn">
          {source ? source : "Choose source"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="SourcesDialogContent">
          <Dialog.Title className="DialogTitle">Choose sources</Dialog.Title>
          <Dialog.Description className="DialogDescription">
            You can choose sources.
            <br />
          </Dialog.Description>

          <Select
          // url={selectUrl}
          // setProjectName={setProjectName}
          // projectName={projectName}
          />

          <div
            style={{
              display: "flex",
              marginTop: 25,
              justifyContent: "flex-end",
            }}
          >
            <Dialog.Close asChild>
              <button data-cy="ok-btn" id="okBtn" className="shareBtn">
                Ok
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
