/* eslint-disable react/prop-types */
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "react-router-dom";
import Close from "../Icons/Close";
import Select from "../Select/Select";
import "./SourcesDialog.css";

// "What has been imported into these sources?" is a question about the current
// selection, so it is asked from where the selection is made rather than from a
// toolbar button -- which, sitting next to the upload control, read as an action
// that uploads something. One link for the whole selection: the report already
// renders a section per source, and the selection is in sessionStorage by the
// time the link is followed (SearchComp holds `sources` in useSessionStorage),
// so nothing has to be passed along in the URL.
function importsLabel(sources) {
  const n = sources?.length || 0;
  if (n === 0) return "See imported files (default source)";
  if (n === 1) return `See imported files in ${sources[0].name}`;
  return `See imported files in these ${n} sources`;
}

export default function SourcesDialog({
  sources,
  setSources,
  allDataSources,
  dialog,
  setDialog,
  setPages,
}) {
  const dataSourcesCaption = () => {
    return (
      <span className="dataSourcesCaption">
        Data sources:{"  "}
        <span className="dataSourcesNumber">
          {(sources && sources[sources?.length - 1]?.name) || "Default"}
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
            setPages={setPages}
          />

          <div className="DialogFooter">
            <Link
              className="importsLink"
              to="/imports"
              onClick={() => setDialog(false)}
              title="Which files were imported into the selected data sources, what each import produced, and whether it looks right"
            >
              {importsLabel(sources)} →
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
