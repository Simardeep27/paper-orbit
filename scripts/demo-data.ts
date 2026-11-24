import type { Paper } from "../lib/types";

export const SYNTHETIC_FETCHED_AT = "2026-10-20T12:00:00.000Z";
export const SYNTHETIC_GENERATED_AT = "2026-10-20T12:00:00.000Z";

type AuthorSeed = string;
type PaperSeed = {
  title: string;
  authors: AuthorSeed[];
  year: number | null;
  venue: string | null;
  abstract: string | null;
  citationCount: number | null;
  referenceCount: number | null;
};

const SEEDS: PaperSeed[] = [
  {
    title: "Orbital Cartography for Research Literature",
    authors: ["Mira Halvorsen", "Devon Okafor"],
    year: 2021,
    venue: "Journal of Visual Analytics",
    abstract:
      "We present a spherical cartography for local citation neighborhoods. The interface places a seed paper at the center, arranges references and citing papers on a bounded shell, and uses text similarity only as a radial cue. A linked paper list keeps exact metadata available while the spatial view supports orientation and recall.",
    citationCount: 148,
    referenceCount: 52,
  },
  {
    title: "A Field Guide to Citation Neighborhoods",
    authors: ["Priya Ramanathan", "Tomas Vela"],
    year: 2018,
    venue: "Computational Reading Symposium",
    abstract:
      "This field guide defines the ego citation neighborhood: a center paper, its references, papers that cite it, and provider-selected recommendations. We argue that bounded samples should be labeled as samples, that citation direction must come from observed provider edges, and that recommendation links should be visually distinct from citations.",
    citationCount: 96,
    referenceCount: 41,
  },
  {
    title: "Uncertainty Cues in Literature Recommendation",
    authors: ["Imani Brooks", "Leo Marchetti"],
    year: 2023,
    venue: "Workshop on Research Interfaces",
    abstract:
      "Literature recommenders often hide missing abstracts, incomplete citation counts, and sampled candidate pools. We study uncertainty cues for recommendation lists and find that explicit missing-data labels help readers compare candidates without treating an ordering as a confidence score. We recommend separating provider rank from local text similarity.",
    citationCount: 61,
    referenceCount: 38,
  },
  {
    title: "Reading Paths Through Dense Citation Graphs",
    authors: ["Sana Qureshi", "Elliot Park"],
    year: 2015,
    venue: "Symposium on Interactive Reading",
    abstract:
      "We trace how readers move from one paper to its references and then to later citing work. Reading paths combine backward and forward citation steps. A history mechanism and a persistent reading list reduced lost context in a small formative study of literature review tasks.",
    citationCount: 212,
    referenceCount: 47,
  },
  {
    title: "The Cost of Missing Metadata in Citation Analytics",
    authors: ["Noor Haddad", "Ravi Deshmukh"],
    year: 2017,
    venue: "Journal of Bibliometric Methods",
    abstract:
      "Missing years, absent abstracts, and unknown citation counts change how ranking and filtering behave. We analyze common metadata gaps and show why unknown values should not be coerced to zero. Inclusive filters and explicit unknown groups prevent silent exclusion of records.",
    citationCount: 0,
    referenceCount: 29,
  },
  {
    title: "Recommender Systems for Scholarly Discovery: A Survey",
    authors: ["Greta Lindqvist", "Mateo Rios", "Hana Sato"],
    year: 2020,
    venue: "Review of Scholarly Search",
    abstract:
      "We survey scholarly recommendation systems, including content-based, citation-based, and collaborative approaches. Provider recommendations are candidates, not verified citations, and their ordering should not be presented as a calibrated relevance score. Transparency about candidate pools is essential.",
    citationCount: 388,
    referenceCount: 112,
  },
  {
    title: "Small Multiples for Temporal Citation Patterns",
    authors: ["Julian Weiss", "Amara Nwosu"],
    year: 2014,
    venue: "Visualization Studies",
    abstract:
      "Small multiple timelines reveal when citing papers appear around a publication. We compare stacked bars, dot plots, and linked histograms for temporal citation patterns. Linked selection between a histogram and a paper list helped participants identify later citing work in a year range.",
    citationCount: null,
    referenceCount: 36,
  },
  {
    title: "Designing for Serendipity in Literature Search",
    authors: ["Felix Moreau", "Ines Duarte"],
    year: 2019,
    venue: "Human Factors in Reading",
    abstract:
      "Serendipitous discovery depends on overview, low-cost inspection, and reversible navigation. We describe a search interface that keeps a local neighborhood visible while readers inspect recommendations. Reversible recentering and a shortlist supported exploration without losing the original seed paper.",
    citationCount: 74,
    referenceCount: 44,
  },
  {
    title: "Evaluating Uncertainty Visualizations for Rankings",
    authors: ["Kofi Mensah", "Lena Fischer"],
    year: 2022,
    venue: "Transactions on Visual Communication",
    abstract:
      "We evaluate how uncertainty annotations affect interpretation of ranked lists. Explicit unknown labels and visual separation of missing values reduced false confidence. Participants preferred local text similarity when its corpus and limitations were explained in plain language.",
    citationCount: 53,
    referenceCount: 31,
  },
  {
    title: "Atlas of a Research Field",
    authors: ["Omar Haddad", "Ruth Kimani"],
    year: 2016,
    venue: "Journal of Visual Analytics",
    abstract:
      "An atlas of a research field can support orientation, but maps of whole fields invite overclaims. We propose local atlases centered on a known publication. The center anchors interpretation, while references and citing papers provide observed structure around a bounded citation neighborhood.",
    citationCount: 167,
    referenceCount: 63,
  },
  {
    title: "From Keywords to Concepts: Query Expansion in Scholarly Search",
    authors: ["Sofia Alvarez", "Theo Nakamura"],
    year: 2019,
    venue: "Information Retrieval Letters",
    abstract:
      "Query expansion can improve scholarly search, but expanded terms may drift from a reader's intent. We compare keyword matching with concept expansion for literature discovery. Transparent local text filters help readers refine loaded results without issuing a new upstream search.",
    citationCount: 129,
    referenceCount: 58,
  },
  {
    title: "Faceted Browsing of Academic Records",
    authors: ["Uma Patel", "Viktor Novak"],
    year: null,
    venue: "Digital Library Interfaces",
    abstract: null,
    citationCount: null,
    referenceCount: 25,
  },
  {
    title: "Local Text Similarity Without Embeddings",
    authors: ["Wen Li", "Yara Saleh"],
    year: 2021,
    venue: "Computational Reading Symposium",
    abstract:
      "We describe a reproducible term-frequency inverse-document-frequency similarity over a loaded paper neighborhood. Titles receive modest extra weight, abstracts are used when available, and missing abstracts yield a title-only coverage label. The method is transparent but can miss conceptual similarity.",
    citationCount: 88,
    referenceCount: 34,
  },
  {
    title: "Visualizing Ego Networks in Citation Databases",
    authors: ["Zane Cooper", "Ada Lindgren"],
    year: 2018,
    venue: "Visualization Studies",
    abstract:
      "Ego network views place one node at the center and its observed neighbors around it. We compare radial two-dimensional layouts with a spherical three-dimensional view. Both views share selection and filters; the list remains necessary for precise comparison of citation counts and years.",
    citationCount: 143,
    referenceCount: 49,
  },
  {
    title: "A Taxonomy of Literature Review Tasks",
    authors: ["Bruno Costa", "Camille Roy"],
    year: 2020,
    venue: "Research Methods Quarterly",
    abstract:
      "Literature review tasks include finding earlier work, identifying later citing papers, comparing candidates, and following a citation trail. We map these domain tasks to lookup, filter, compare, rank, identify distributions, inspect adjacency, and follow directed connections. The taxonomy informed the design of a bounded neighborhood browser.",
    citationCount: 205,
    referenceCount: 71,
  },
  {
    title: "Following Citations: A Longitudinal User Study",
    authors: ["Darius Bell", "Elena Petrova"],
    year: 2020,
    venue: "Human Factors in Reading",
    abstract:
      "We followed readers as they moved across citation trails over several weeks. Backward references supported grounding in earlier work, while forward citations supported tracking later developments. Readers wanted history controls and a saved reading list that survived navigation between papers.",
    citationCount: 118,
    referenceCount: 46,
  },
  {
    title: "Reading Lists as Interfaces",
    authors: ["Farah Aziz", "Gabriel Silva"],
    year: 2017,
    venue: "Digital Library Interfaces",
    abstract:
      "A reading list is more than an export format. When saved papers remain visible beside an exploratory visualization, readers can compare candidates and plan later reading. We describe a versioned local reading list with optional notes and a deterministic export format.",
    citationCount: 67,
    referenceCount: 28,
  },
  {
    title: "Trust and Transparency in Paper Recommendations",
    authors: ["Mira Halvorsen", "Imani Brooks"],
    year: 2023,
    venue: "Workshop on Research Interfaces",
    abstract:
      "Readers trust recommendations more when provider rank, candidate pool, and missing metadata are explained. We distinguish citation relationships from recommendation associations and show that dashed links and separate controls reduce confusion. Transparency does not require claiming a semantic explanation.",
    citationCount: 49,
    referenceCount: 33,
  },
  {
    title: "Temporal Ordering in Citation Graphs",
    authors: ["Tomas Vela", "Julian Weiss"],
    year: 2015,
    venue: "Visualization Studies",
    abstract:
      "Citation graphs have strong temporal ordering, but surprising directions can occur in provider data. We preserve observed directions rather than correcting them from publication years. A linked timeline shows the distribution of publication years and separates unknown years from known counts.",
    citationCount: 156,
    referenceCount: 39,
  },
  {
    title: "The Geometry of Bibliographic Records",
    authors: ["Hana Sato", "Omar Haddad"],
    year: 2013,
    venue: "Information Visualization",
    abstract:
      "Bibliographic records have no natural geographic coordinates. We explore geometric encodings for local record sets and warn against reading angular proximity as topical similarity. Radial distance can encode a defined score, but peripheral-to-peripheral distances should not be interpreted as semantic structure.",
    citationCount: 0,
    referenceCount: 22,
  },
  {
    title: "Missing Years and Biased Trends",
    authors: ["Noor Haddad", "Ruth Kimani"],
    year: 2022,
    venue: "Journal of Bibliometric Methods",
    abstract:
      "Publication-year distributions are biased when unknown years are dropped silently. We compare complete-case analysis with an explicit unknown-year group. A separate unknown count and an inclusive range filter make missingness visible without imputing dates.",
    citationCount: 42,
    referenceCount: 30,
  },
  {
    title: "Interactive Comparison of Research Contributions",
    authors: ["Elliot Park", "Sofia Alvarez"],
    year: 2019,
    venue: "Symposium on Interactive Reading",
    abstract:
      "Choosing what to read next often means comparing two candidates. We designed a side-by-side comparison panel that shows title, authors, year, venue, citation count, memberships, abstract, and available text similarity. The panel avoids automatic winners and quality judgments.",
    citationCount: 91,
    referenceCount: 37,
  },
  {
    title: "Paper Trails: Navigating References at Scale",
    authors: ["Theo Nakamura", "Uma Patel"],
    year: 2016,
    venue: "Digital Library Interfaces",
    abstract:
      "Paper trails combine references, citing papers, and recommendations into a navigable reading path. At scale, unbounded expansion becomes disorienting. We bound each neighborhood and make recentering an explicit transaction with history and reversible navigation.",
    citationCount: 132,
    referenceCount: 55,
  },
  {
    title: "Beyond the H-Index: Contextual Citation Displays",
    authors: ["Viktor Novak", "Wen Li"],
    year: 2014,
    venue: "Review of Scholarly Search",
    abstract:
      "Citation counts summarize indexed attention, not research quality. We design contextual citation displays with log-scaled marks, explicit unknown glyphs, and plain-language caveats. Readers should compare counts locally and remember that older papers have had more time to accumulate citations.",
    citationCount: 178,
    referenceCount: 40,
  },
  {
    title: "Sampling Strategies for Citation Networks",
    authors: ["Yara Saleh", "Zane Cooper"],
    year: 2019,
    venue: "Journal of Bibliometric Methods",
    abstract:
      "Citation networks are too large to retrieve in full. We compare breadth-limited samples of references, citing papers, and recommendations. Retrieved counts must remain separate from provider totals, and each branch should report whether more pages are available. A bounded sample is not a complete graph.",
    citationCount: null,
    referenceCount: 43,
  },
  {
    title: "Designing Accessible Data Dashboards",
    authors: ["Ada Lindgren", "Bruno Costa"],
    year: 2018,
    venue: "Transactions on Visual Communication",
    abstract:
      "Accessible dashboards provide keyboard-operable controls, visible focus, text alternatives, and non-color encodings. We describe a coordinated dashboard with a canvas visualization, an equivalent list, numeric inputs, and restrained live announcements. The list is a first-class view rather than a fallback afterthought.",
    citationCount: 234,
    referenceCount: 61,
  },
  {
    title: "Provenance in Scholarly Data Pipelines",
    authors: ["Camille Roy", "Darius Bell"],
    year: 2021,
    venue: "Research Data Practices",
    abstract:
      "Scholarly data pipelines should preserve source, retrieval time, requested fields, sampling limits, and branch failures. We show how provenance panels help readers distinguish a failed branch from an empty result and a sampled neighborhood from a complete corpus. Successful empty responses remain empty, not errors.",
    citationCount: 57,
    referenceCount: 35,
  },
  {
    title: "Immersive Analytics for Digital Libraries",
    authors: ["Elena Petrova", "Farah Aziz"],
    year: 2017,
    venue: "Information Visualization",
    abstract:
      "Immersive three-dimensional views can support orientation and recall in digital libraries, but they also introduce occlusion and perspective distortion. We pair a spherical view with a two-dimensional radial projection and a sortable list. Precise values remain in text, and a reset camera action is always available.",
    citationCount: 121,
    referenceCount: 48,
  },
  {
    title: "The Role of Venue in Reading Decisions",
    authors: ["Gabriel Silva", "Mira Halvorsen"],
    year: 2016,
    venue: "Human Factors in Reading",
    abstract:
      "Venue is a salient cue when readers choose among papers. In a small study, venue and year together helped participants narrow candidates, but venue alone was a poor proxy for relevance. Filters should keep venue visible without turning it into a quality score.",
    citationCount: 83,
    referenceCount: 26,
  },
  {
    title: "Supporting Novice Researchers with Visual Analytics",
    authors: ["Priya Ramanathan", "Kofi Mensah"],
    year: 2022,
    venue: "Workshop on Research Interfaces",
    abstract:
      "Novice researchers benefit from an explicit starting paper, a bounded neighborhood, and clear next actions. We describe a literature review workflow of search, explore, inspect, and recenter. Participants wanted a reading list, comparison, and an offline demonstration that did not depend on a live provider.",
    citationCount: 76,
    referenceCount: 32,
  },
  {
    title: "A Survey of Citation Context Extraction",
    authors: ["Lena Fischer", "Leo Marchetti"],
    year: 2015,
    venue: "Review of Scholarly Search",
    abstract:
      "Citation context extraction identifies how a citing paper discusses a cited paper. The approach requires full text or provider-supplied contexts and is outside a metadata-only neighborhood browser. We survey methods and caution against inferring citation intent from titles, shared authors, or recommendation associations.",
    citationCount: 267,
    referenceCount: 88,
  },
  {
    title: "Uncertainty-Aware Reading Lists",
    authors: ["Imani Brooks", "Hana Sato"],
    year: 2024,
    venue: "Workshop on Research Interfaces",
    abstract:
      "Reading lists usually record papers without recording why they were saved or which metadata were missing. We propose uncertainty-aware reading lists that preserve missing-value states and provenance. Saved items from another center should not reuse an old similarity score against the current center.",
    citationCount: 31,
    referenceCount: 19,
  },
  {
    title: "How Users Compare Candidate Papers",
    authors: ["Mateo Rios", "Amara Nwosu"],
    year: 2021,
    venue: "Symposium on Interactive Reading",
    abstract:
      "We observed readers comparing candidate papers by year, venue, citation count, abstract, and relationship to a known paper. Side-by-side layouts supported comparison, while a single details panel encouraged serial inspection. Saving two candidates helped readers return to a decision later.",
    citationCount: 64,
    referenceCount: 27,
  },
  {
    title: "From Search Results to Reading Plans",
    authors: ["Julian Weiss", "Ines Duarte"],
    year: 2018,
    venue: "Digital Library Interfaces",
    abstract:
      "Search results become reading plans when readers can inspect, compare, and save candidates. We connect a search box to a local exploration state and a persistent reading list. Exports include only saved papers, with provenance and notes, rather than the entire retrieved dataset.",
    citationCount: 102,
    referenceCount: 38,
  },
  {
    title: "Network Layouts for Bounded Neighborhoods",
    authors: ["Felix Moreau", "Sana Qureshi"],
    year: 2013,
    venue: "Information Visualization",
    abstract:
      "Force-directed layouts are unstable under filtering. For a bounded ego neighborhood, we prefer deterministic radial positions that do not move when filters change. A similarity-radius layout and an even-shell layout offer two arrangements without recomputing scores or dropping nodes to improve appearance.",
    citationCount: 145,
    referenceCount: 41,
  },
  {
    title: "Explaining Recommendation Rank Without Scores",
    authors: ["Omar Haddad", "Sofia Alvarez"],
    year: 2024,
    venue: "Workshop on Research Interfaces",
    abstract:
      "A provider may return an ordered recommendation list without a numerical score. We explain rank as ordering only and avoid presenting it as a similarity magnitude. Local text similarity is offered separately, with its corpus and coverage stated, so readers can compare candidates with appropriate caution.",
    citationCount: 27,
    referenceCount: 17,
  },
  {
    title: "The Sample Coverage Problem in Literature Tools",
    authors: ["Ruth Kimani", "Wen Li"],
    year: 2020,
    venue: "Research Data Practices",
    abstract:
      "Literature tools often present sampled citation data as if it were complete. We propose coverage records with requested limits, received entries, valid distinct papers, skipped records, and continuation offsets. A partial branch failure is different from a genuinely empty branch and must be labeled as such.",
    citationCount: 71,
    referenceCount: 33,
  },
  {
    title: "Evaluating Scholarly Recommendation Transparency",
    authors: ["Lena Fischer", "Gabriel Silva"],
    year: 2025,
    venue: "Workshop on Research Interfaces",
    abstract:
      "We evaluate transparency labels for scholarly recommendations across candidate pools. Participants distinguished citations from recommendations when link styles and filters were separate. They also wanted a persistent provenance panel and a clear explanation of what local text similarity does and does not measure.",
    citationCount: 12,
    referenceCount: 14,
  },
  {
    title: "Citation Direction and Perceived Influence",
    authors: ["Devon Okafor", "Yara Saleh"],
    year: 2019,
    venue: "Journal of Bibliometric Methods",
    abstract:
      "Readers infer influence from arrow direction. We show that citation arrows must point from citing paper to cited paper and that recommendation links must not reuse citation arrows. In a small evaluation, inconsistent directions produced relationship errors even when titles and years were visible.",
    citationCount: 98,
    referenceCount: 36,
  },
  {
    title: "Designing Offline Demonstrations for Research Tools",
    authors: ["Tomas Vela", "Camille Roy"],
    year: 2022,
    venue: "Research Data Practices",
    abstract:
      "Offline demonstrations protect research tools from network failures and shared rate limits. We describe deterministic local fixtures that use the same normalized contracts as the live adapter. Synthetic fixtures are labeled persistently and never presented as real research data. Stored snapshots include provenance and retrieval dates.",
    citationCount: 45,
    referenceCount: 21,
  },
  {
    title: "Metadata Repair for Legacy Bibliographies",
    authors: ["Darius Bell", "Ada Lindgren"],
    year: 2011,
    venue: "Digital Library Interfaces",
    abstract:
      "Legacy bibliographies contain missing identifiers, inconsistent author names, and absent abstracts. We describe conservative repair rules that preserve unknown values and refuse to infer citation edges from similar titles or shared authors. A paper with no usable identifier is skipped and counted.",
    citationCount: null,
    referenceCount: 18,
  },
  {
    title: "A Notebook of Unpublished Reading Notes",
    authors: [],
    year: null,
    venue: null,
    abstract: null,
    citationCount: null,
    referenceCount: null,
  },
];

export const SYNTHETIC_PAPERS: Paper[] = SEEDS.map((seed, index) => {
  const number = String(index + 1).padStart(3, "0");
  return {
    id: `syn-paper-${number}`,
    title: seed.title,
    authors: seed.authors.map((name, authorIndex) => ({
      id: `syn-author-${number}-${authorIndex + 1}`,
      name,
    })),
    year: seed.year,
    venue: seed.venue,
    abstract: seed.abstract,
    citationCount: seed.citationCount,
    referenceCount: seed.referenceCount,
    url: null,
    externalIds: {},
    source: "synthetic-test" as const,
    fetchedAt: SYNTHETIC_FETCHED_AT,
  };
});

export const SYNTHETIC_BY_ID = new Map(
  SYNTHETIC_PAPERS.map((paper) => [paper.id, paper]),
);

export interface SyntheticNeighborhoodSpec {
  centerId: string;
  references: string[];
  citing: string[];
  recommended: string[];
}

export const SYNTHETIC_NEIGHBORHOODS: SyntheticNeighborhoodSpec[] = [
  {
    centerId: "syn-paper-001",
    references: [
      "syn-paper-002",
      "syn-paper-010",
      "syn-paper-014",
      "syn-paper-020",
      "syn-paper-025",
      "syn-paper-031",
      "syn-paper-041",
    ],
    citing: [
      "syn-paper-004",
      "syn-paper-011",
      "syn-paper-018",
      "syn-paper-027",
      "syn-paper-033",
    ],
    recommended: [
      "syn-paper-006",
      "syn-paper-009",
      "syn-paper-013",
      "syn-paper-019",
      "syn-paper-023",
      "syn-paper-028",
      "syn-paper-034",
      "syn-paper-031",
      "syn-paper-042",
    ],
  },
  {
    centerId: "syn-paper-002",
    references: [
      "syn-paper-004",
      "syn-paper-005",
      "syn-paper-007",
      "syn-paper-012",
      "syn-paper-020",
      "syn-paper-035",
    ],
    citing: [
      "syn-paper-001",
      "syn-paper-003",
      "syn-paper-016",
      "syn-paper-029",
    ],
    recommended: [
      "syn-paper-007",
      "syn-paper-011",
      "syn-paper-017",
      "syn-paper-022",
      "syn-paper-026",
      "syn-paper-030",
    ],
  },
  {
    centerId: "syn-paper-003",
    references: [
      "syn-paper-002",
      "syn-paper-008",
      "syn-paper-013",
      "syn-paper-021",
      "syn-paper-027",
      "syn-paper-039",
    ],
    citing: [
      "syn-paper-009",
      "syn-paper-018",
      "syn-paper-033",
      "syn-paper-038",
    ],
    recommended: [
      "syn-paper-006",
      "syn-paper-013",
      "syn-paper-015",
      "syn-paper-024",
      "syn-paper-032",
      "syn-paper-036",
      "syn-paper-040",
    ],
  },
];

export const SYNTHETIC_CENTER_IDS = SYNTHETIC_NEIGHBORHOODS.map(
  (spec) => spec.centerId,
);
