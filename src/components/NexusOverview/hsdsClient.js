// A minimal read-only HSDS REST client shaped as the `api` object
// `nexus.js` expects: `getEntity(path)`, `getValue({ dataset })`,
// `getAttrValues(entity)`.
//
// @h5web/app talks to the same HSDS instance, but its data layer is only
// reachable through React-suspense hooks (`useEntity`, `useDatasetValue`),
// which cannot drive a recursive tree walk. This client hits the documented
// HSDS REST endpoints directly so the framework-free `nexus.js` port can run
// in one async pass. Everything is cached by object id, so a whole-file read
// costs roughly one request per group/dataset it touches.
//
// HSDS REST surface used:
//   GET /?domain=<d>                         -> { root: <group-id> }
//   GET /groups/<id>/links?domain=<d>        -> { links: [{title, class, collection?, id?, h5path?}] }
//   GET /groups|datasets/<id>/attributes?domain=<d>&IncludeData=1
//   GET /datasets/<id>?domain=<d>            -> { shape: { class, dims } }
//   GET /datasets/<id>/value?domain=<d>      -> { value }

const KIND_BY_COLLECTION = {
  groups: "group",
  datasets: "dataset",
  datatypes: "datatype",
};

const MAX_LINK_DEPTH = 32;

export function createHsdsClient({ hsdsUrl, domain, authHeader }) {
  const base = String(hsdsUrl).replace(/\/+$/, "");
  const dom = domain.startsWith("/") ? domain : `/${domain}`;
  const headers = authHeader ? { Authorization: authHeader } : {};

  const linksById = new Map(); // id -> child stub[]
  const attrsById = new Map(); // id -> { name: value }
  const shapeById = new Map(); // dataset id -> number[]
  let rootId = null;

  async function get(path) {
    const sep = path.includes("?") ? "&" : "?";
    const url = `${base}${path}${sep}domain=${encodeURIComponent(dom)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`HSDS ${res.status} for ${path.split("?")[0]}`);
    }
    return res.json();
  }

  async function getRootId() {
    if (!rootId) rootId = (await get("/")).root;
    return rootId;
  }

  function join(parentPath, title) {
    return parentPath === "/" ? `/${title}` : `${parentPath}/${title}`;
  }

  async function childStubs(groupId, groupPath) {
    if (linksById.has(groupId)) return linksById.get(groupId);
    const { links = [] } = await get(`/groups/${groupId}/links`);
    const stubs = links.map((link) => {
      const stub = {
        name: link.title,
        path: join(groupPath, link.title),
        kind: KIND_BY_COLLECTION[link.collection] || "group",
      };
      if (link.class === "H5L_TYPE_SOFT") {
        stub.__soft = link.h5path;
        stub.kind = "group"; // resolved on demand
      } else {
        stub.__id = link.id;
        stub.__collection = link.collection || "groups";
      }
      return stub;
    });
    linksById.set(groupId, stubs);
    return stubs;
  }

  async function expand(stub) {
    if (stub.kind === "group") {
      stub.children = await childStubs(stub.__id, stub.path);
    } else if (stub.kind === "dataset") {
      if (!shapeById.has(stub.__id)) {
        const meta = await get(`/datasets/${stub.__id}`);
        shapeById.set(
          stub.__id,
          meta.shape?.class === "H5S_SCALAR" ? [] : meta.shape?.dims ?? [],
        );
      }
      stub.shape = shapeById.get(stub.__id);
    }
    return stub;
  }

  async function resolve(path, depth = 0) {
    if (depth > MAX_LINK_DEPTH) throw new Error("link cycle");
    const segments = path.split("/").filter(Boolean);
    const rid = await getRootId();
    let node = {
      kind: "group",
      name: "",
      path: "/",
      __id: rid,
      __collection: "groups",
    };
    node.children = await childStubs(rid, "/");

    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      const child = node.children?.find((c) => c.name === seg);
      if (!child) throw new Error(`no entity at ${acc}`);
      if (child.__soft) {
        node = await resolve(child.__soft, depth + 1);
      } else {
        node = await expand({ ...child });
      }
    }
    return node;
  }

  return {
    async getEntity(path) {
      return resolve(path);
    },

    async getValue({ dataset }) {
      if (!dataset?.__id) return undefined;
      const { value } = await get(`/datasets/${dataset.__id}/value`);
      return value;
    },

    async getAttrValues(entity) {
      const id = entity?.__id;
      if (!id) return {};
      if (attrsById.has(id)) return attrsById.get(id);
      const col = entity.__collection || "groups";
      let out = {};
      try {
        const { attributes = [] } = await get(
          `/${col}/${id}/attributes?IncludeData=1`,
        );
        for (const attr of attributes) {
          if ("value" in attr) out[attr.name] = attr.value;
          else {
            const one = await get(`/${col}/${id}/attributes/${encodeURIComponent(attr.name)}`);
            out[attr.name] = one.value;
          }
        }
      } catch {
        out = {};
      }
      attrsById.set(id, out);
      return out;
    },
  };
}
