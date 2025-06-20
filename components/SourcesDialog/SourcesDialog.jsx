import * as Dialog from "@radix-ui/react-dialog";
import Select from "../Select/Select";
import "./SourcesDialog.css";

export default function SourcesDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button data-cy="preferences-btn" id="preferences" className="shareBtn">
          Choose sources
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
