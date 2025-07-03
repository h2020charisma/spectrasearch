import * as Dialog from "@radix-ui/react-dialog";
import Close from "../Icons/Close";
import Select from "../Select/Select";
import "./SourcesDialog.css";

export default function SourcesDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          data-cy="preferences-btn"
          id="preferences"
          className="sourcesBtn"
        >
          Choose data source
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="SourcesDialogContent">
          <div className="DialogHeader">
            <Dialog.Title className="DialogTitle">
              Choose data sources
            </Dialog.Title>
            <Dialog.Close asChild>
              <div data-cy="ok-btn" id="okBtn" className="closeBtn">
                <Close />
              </div>
            </Dialog.Close>
          </div>
          <Dialog.Description className="DialogDescription">
            Selected data sources:
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
          ></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
