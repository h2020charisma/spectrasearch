import React from "react";
import { Kekule } from "kekule";
import "kekule/theme";

import { Components } from "kekule-react";
import "./composerAndViewer.css";

const { Viewer, Composer } = Components;

let format = "cml";

class ComposerAndViewer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      composerPredefinedSetting: "molOnly",
      viewerPredefinedSetting: "basic",
      chemObj: null,
      selectedObjs: [],
      smiles: "",
      smilesString: sessionStorage.getItem("SMILES") || "",
      molString: sessionStorage.getItem("MOL") || "",
    };

    this.composer = React.createRef();
    this.viewer = React.createRef();

    this.onPredefineSettingChange = this.onPredefineSettingChange.bind(this);
    this.onComposerUserModificationDone =
      this.onComposerUserModificationDone.bind(this);
    this.onComposerSelectionChange = this.onComposerSelectionChange.bind(this);
    this.exportSmiles = this.exportSmiles.bind(this);
  }

  componentDidMount() {
    if (this.state.molString) {
      this.loadMol(this.state.molString);
    }
  }

  loadMol(mol) {
    if (!mol) return;
    try {
      const molecule = Kekule.IO.loadFormatData(mol, "mol");
      this.setState({ chemObj: molecule }, () => {
        const composerWidget = this.composer.current?.getWidget();
        if (composerWidget) {
          composerWidget.setChemObj(molecule);
        }
      });
    } catch (e) {
      console.error("Failed to load molecule from storage", e);
    }
  }

  /* -----------------------------
   * Core logic: Composer → SMILES
   * ----------------------------- */
  // Kekule.IO.saveFormatData
  getSmilesFromComposer() {
    const composerWidget = this.composer.current?.getWidget();
    if (!composerWidget) return "";

    const chemSpace = composerWidget.getChemObj();
    if (!chemSpace) return "";

    const molecules = chemSpace
      .getChildren()
      .filter((obj) => obj instanceof Kekule.StructureFragment);

    if (!molecules.length) return "";

    return Kekule.IO.saveFormatData(molecules[0], format);
  }

  getMolFromComposer() {
    const composerWidget = this.composer.current?.getWidget();
    if (!composerWidget) return "";

    const chemSpace = composerWidget.getChemObj();
    if (!chemSpace) return "";

    const molecules = chemSpace
      .getChildren()
      .filter((obj) => obj instanceof Kekule.StructureFragment);

    if (!molecules.length) return "";

    return Kekule.IO.saveFormatData(molecules[0], "mol");
  }

  loadSmilesToComposer(smilesString) {
    if (!smilesString) return;
    let cmlData =
      '<cml xmlns="http://www.xml-cml.org/schema"><molecule id="m1"><atomArray><atom id="a2" elementType="C" x2="7.493264658965051" y2="35.58088907877604"/><atom id="a3" elementType="O" x2="8.186084981992602" y2="35.18088907877604"/><atom id="a1" elementType="C" x2="6.800444335937501" y2="35.18088907877604"/></atomArray><bondArray><bond id="b2" order="S" atomRefs2="a2 a3"/><bond id="b1" order="S" atomRefs2="a2 a1"/></bondArray></molecule></cml>';
    // 1. Load the SMILES into a Kekule molecule object
    const molecule = Kekule.IO.loadFormatData(smilesString, format);

    // 2. Update the state to reflect the new molecule in the Viewer
    this.setState(
      {
        chemObj: molecule,
        smiles: smilesString,
      },
      () => {
        // 3. Manually update the Composer widget's internal object
        const composerWidget = this.composer.current?.getWidget();
        if (composerWidget) {
          composerWidget.setChemObj(molecule);
        }
      },
    );
  }

  /* -----------------------------
   * Event handlers
   * ----------------------------- */
  onComposerUserModificationDone() {
    const composerWidget = this.composer.current.getWidget();

    // update viewer
    this.setState({
      chemObj: composerWidget.getChemObj(),
      smiles: this.getSmilesFromComposer(),
    });

    // Auto-save to sessionStorage
    sessionStorage.setItem("SMILES", this.getSmilesFromComposer());
    const mol = this.getMolFromComposer();
    if (mol) sessionStorage.setItem("MOL", mol);

    // this.viewer.current.getWidget().requestRepaint();
  }

  onComposerSelectionChange() {
    this.setState({
      selectedObjs: this.composer.current.getWidget().getSelection(),
    });
  }

  onPredefineSettingChange(e) {
    this.setState({ composerPredefinedSetting: e.target.value });
  }

  /* -----------------------------
   * UI helpers
   * ----------------------------- */
  getComposerSelectedAtomsAndBonds(selection) {
    const result = { atoms: [], bonds: [] };

    (selection || []).forEach((obj) => {
      if (obj instanceof Kekule.Atom) result.atoms.push(obj);
      else if (obj instanceof Kekule.Bond) result.bonds.push(obj);
    });

    return result;
  }

  exportSmiles() {
    const smiles = this.getSmilesFromComposer();
    console.log("SMILES:", smiles);
    this.setState({ smiles });
    sessionStorage.setItem("SMILES", smiles);

    // Call parent callback if provided
    if (this.props.onSmilesExport && smiles) {
      this.props.onSmilesExport(smiles);
    }
  }

  exportMol() {
    const molContent = this.getMolFromComposer();
    if (!molContent) return;

    const file = new File([molContent], "structure.mol", { type: "chemical/x-mdl-molfile" });

    if (this.props.onMolExport) {
      this.props.onMolExport(file);
    }
  }

  /* -----------------------------
   * Render
   * ----------------------------- */
  render() {
    return (
      <div className="ComposerAndViewerDemo" >
        <div className="ComposerViewerPair">
          <Composer
            className="SubWidget"
            ref={this.composer}
            predefinedSetting="fullFunc"
            onUserModificationDone={this.onComposerUserModificationDone}
            onSelectionChange={this.onComposerSelectionChange}
          />
        </div>

        <div className="ControlPanel">
          <button className="shareBtn" onClick={() => this.exportMol()}>
            Export Mol
          </button>
          <button
            className="shareBtn secondary"
            onClick={() => this.loadSmilesToComposer(this.state.smilesString)}
          >
            Load SMILES
          </button>
        </div>
      </div>
    );
  }
}

export default ComposerAndViewer;
