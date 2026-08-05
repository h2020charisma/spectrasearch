/* eslint-disable no-undef */
import { resolveViewersForItem } from "../../src/viewers";

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
});
