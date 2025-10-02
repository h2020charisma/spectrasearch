/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import Close from "../Icons/Close";
import Select from "../Select/Select";
import "./SourcesDialog.css";

export default function SourcesDialog({
  sources,
  setSources,
  allDataSources,
  dialog,
  setDialog,
}) {
  const dataSourcesCaption = () => {
    return (
      <span className="dataSourcesCaption">
        Data sources:{"  "}
        <span className="dataSourcesNumber">
          {(sources && sources[sources?.length - 1]?.name) || "No one selected"}
        </span>
        {sources && sources?.length > 1 && (
          <span>&nbsp;&nbsp;+ {sources?.length - 1}</span>
        )}
      </span>
    );
  };

  return (
    <Dialog.Root open={dialog} onOpenChange={setDialog}>
      <Dialog.Trigger asChild>
        <button data-cy="sources-btn" id="sources" className="sourcesBtn">
          {dataSourcesCaption()}
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
              <div
                data-cy="ok-btn"
                id="okBtn"
                className="closeBtnSourcesDialog"
              >
                <Close />
              </div>
            </Dialog.Close>
          </div>
          <Dialog.Description className="DialogDescription">
            Selected data sources:
            <br />
          </Dialog.Description>

          <Select
            sources={sources}
            setSources={setSources}
            allDataSources={allDataSources}
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
