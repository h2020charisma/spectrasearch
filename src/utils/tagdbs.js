// Maps the 4-letter AMBIT database tag (Solr field: dbtag_hss[0], or prefix before
// the first "-" in s_uuid_hs) to the AMBIT server base URL.
// Ported from nanodata-11ty: assets/js/search/tagdbs.js
const TAG_DBS = {
  ENM:  { server: "https://data.enanomapper.net/" },
  NNRG: { server: "https://apps.ideaconsult.net/nanoreg1/" },
  MRNA: { server: "https://apps.ideaconsult.net/marina/" },
  NTST: { server: "https://apps.ideaconsult.net/nanotest/" },
  NGTX: { server: "https://apps.ideaconsult.net/nanogenotox/" },
  ENPR: { server: "https://apps.ideaconsult.net/enpra/" },
  GRCS: { server: "https://apps.ideaconsult.net/gracious/" },
  PGMS: { server: "https://apps.ideaconsult.net/gracious_pigments/" },
  CLBR: { server: "https://apps.ideaconsult.net/calibrate/" },
  NRG2: { server: "https://apps.ideaconsult.net/nanoreg2/" },
  NOMX: { server: "https://apps.ideaconsult.net/nanoomics/" },
  SNWK: { server: "https://apps.ideaconsult.net/sanowork/" },
  RGNE: { server: "https://apps.ideaconsult.net/riskgone/" },
  CNLB: { server: "https://apps.ideaconsult.net/marina/" },
  NGRV: { server: "https://apps.ideaconsult.net/gracious/" },
  NOSH: { server: "https://apps.ideaconsult.net/nanoinformatix/" },
  NTIX: { server: "https://apps.ideaconsult.net/nanoinformatix/" },
  AMBT: { server: "https://ambitlri.ideaconsult.net/tool2/" },
  SBDN: { server: "https://apps.ideaconsult.net/sbd4nano/" },
  SBMA: { server: "https://apps.ideaconsult.net/sabydoma/" },
  HRMZ: { server: "https://apps.ideaconsult.net/harmless/" },
  PATS: { server: "https://apps.ideaconsult.net/patrols/" },
  CRMA: { server: "https://apps.ideaconsult.net/charisma/" },
  POLY: { server: "https://apps.ideaconsult.net/polyrisk/" },
  PLFT: { server: "https://apps.ideaconsult.net/plasticfate/" },
  HEAL: { server: "https://apps.ideaconsult.net/plasticheal/" },
  AMT3: { server: "https://apps.ideaconsult.net/polyrisk/solr/ambitlri/" },
  IUC6: { server: "https://apps.ideaconsult.net/tool3/" },
  ZROF: { server: "https://apps.ideaconsult.net/zerof/" },
};

// Derive the AMBIT server base URL from either:
//   - a dbtag string ("NNRG"), or
//   - a substance UUID ("NNRG-2cb3446e-...") — prefix before the first "-" is used
// Returns null if the tag is not recognised.
export function substance2server(tagOrUuid) {
  if (!tagOrUuid) return null;
  const tag = tagOrUuid.includes("-") ? tagOrUuid.split("-")[0] : tagOrUuid;
  return TAG_DBS[tag]?.server ?? null;
}
