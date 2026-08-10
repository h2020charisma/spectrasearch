/* eslint-disable no-undef */
import {
  compatibleItemsForViewer,
  multiViewersForItems,
  resolveViewersForItem,
  viewerMultiHref,
} from "../../src/viewers";

function primaryHref(item) {
  return resolveViewersForItem(item)[0]?.href;
}

describe("Viewer route resolution", () => {
  it("normalizes rooted HDF5 domains and preserves the initial path", () => {
    expect(
      primaryHref({
        type: "study",
        value: "/RRUF/example.nxs#/entry/spectrum",
      })
    ).to.equal("/h5web/RRUF/example.nxs#/entry/spectrum");
  });

  it("accepts unrooted HDF5 domains", () => {
    expect(
      primaryHref({
        type: "study",
        value: "RRUF/example.nxs#/entry/spectrum",
      })
    ).to.equal("/h5web/RRUF/example.nxs#/entry/spectrum");
  });

  it("omits route viewers when their identifier is missing", () => {
    expect(resolveViewersForItem({ type: "study", value: null })).to.deep.equal(
      []
    );
  });

  it("keeps query-based viewer routes unchanged", () => {
    expect(primaryHref({ type: "chemical", id: "DTXSID123" })).to.equal(
      "/predictions?compound=DTXSID123"
    );
  });

  it("passes only compatible items with identifiers to a multi-viewer", () => {
    const items = [
      { type: "prediction", id: "P1" },
      { type: "study", id: "S1", value: "/RRUF/example.nxs" },
      { type: "chemical", id: "DTXSID123" },
      { type: "prediction", id: null },
    ];
    const viewer = multiViewersForItems(items).find((v) => v.id === "predictions");
    const viewerItems = compatibleItemsForViewer(viewer, items);

    expect(viewerItems).to.have.length(2);
    expect(viewerMultiHref(viewer, items)).to.equal(
      "/predictions?item=P1&compound=DTXSID123"
    );
  });

  it("omits multi-viewers with no compatible identified items", () => {
    const viewers = multiViewersForItems([
      { type: "study", id: "S1", value: "/RRUF/example.nxs" },
      { type: "prediction", id: "" },
    ]);

    expect(viewers.map((v) => v.id)).not.to.include("predictions");
  });
});
