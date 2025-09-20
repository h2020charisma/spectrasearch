/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import Close from "../Icons/Close";
import Select from "../Select/Select";
import "./SourcesDialog.css";

// `Data sources: ${sources.length} of ${sourcesNumber} selected`

export default function SourcesDialog({ sources, setSources }) {
  const sourcesNumber = localStorage.getItem("numberOfsources") || 0;
  const defaultSource = localStorage.getItem("defaultSource") || "";

  console.log(sources.length, "!!!sources in SourcesDialog");

  const dataSourcesCaption = () => {
    return (
      <span className="dataSourcesCaption">
        Data sources:{"  "}
        <span className="dataSourcesNumber">
          {sources.length === 0 ? defaultSource : sources[0].name}
        </span>
        {sources.length > 0 && <span>&nbsp;&nbsp;+ {sources.length}</span>}
      </span>
    );
  };

  return (
    <Dialog.Root>
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

          <Select sources={sources} setSources={setSources} />

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
