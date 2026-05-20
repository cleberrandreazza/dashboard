import type { ParsingProfile } from "./types";

/** Perfil padrão Multiplan Regional Sul — editável via banco (sheet_profiles) */
export const MULTIPLAN_DEFAULT_PROFILE: ParsingProfile = {
  id: "multiplan_regional_sul",
  name: "Multiplan Regional Sul",
  description:
    "Perfil baseado nas planilhas PKB, BSS e PCN 2026. Abas matriciais (métricas × meses) e Influs tabular.",
  shoppingFromFileRegex: "(PKB|BSS|PCN)",
  platformAliases: {
    ig: "Instagram",
    insta: "Instagram",
    fb: "Facebook",
  },
  sheetRules: [
    {
      sheetPattern: "onde buscar",
      domain: "unknown",
      layout: "metadata",
      skip: true,
    },
    {
      sheetPattern: "Redes Sociais",
      domain: "social_media",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Analytics",
      domain: "analytics",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Multi",
      domain: "multi_app",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Shopping",
      domain: "shopping",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Influs",
      domain: "influencers",
      layout: "table_records",
    },
    {
      sheetPattern: "Fornecedores",
      domain: "vendors",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Barracadabra",
      domain: "venue",
      layout: "matrix_metrics",
    },
    {
      sheetPattern: "Parque do Park",
      domain: "venue",
      layout: "matrix_metrics",
    },
  ],
};
