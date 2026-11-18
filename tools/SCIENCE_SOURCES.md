# Science reference dataset (v20.18)

This dataset is an index of **10,000 reference records**, not 10,000 distinct concepts, complete proofs, new model weights, or independently verified claims.

- 9,878 line-addressed snippets of Lean `lemma`, `theorem`, and `def` declarations from selected mathlib4 areas. A snippet may omit namespace, local assumptions, or the rest of the proof. The source files were not built or independently kernel-checked during import.
- 27 TheorIA JSON entries: explanation, equations and derivation text; original contributor attribution is included per entry. Other metadata can be read at the linked source.
- 95 OpenStax University Physics volume 3 CNXML modules; excerpts include up to five text paragraphs, and MathML is replaced with a marker rather than being converted into misleading equations. Figures and some other context are not included. Full source is linked.

Upstream pinned commits:
- mathlib4 `00ff07c42f6b7c240f3c00110203c8bcd93b39af` https://github.com/leanprover-community/mathlib4, Apache-2.0. License and original source-file headers: `third-party/mathlib4-APACHE-2.0.txt`, `third-party/mathlib4-notices.txt`.
- TheorIA `ea64e6b7a363ed138562383e783507858ef7c9be` https://github.com/theoria-dataset/theoria-dataset, CC BY 4.0. TheorIA Dataset, 2026; original entry contributor attribution is retained in each record. https://creativecommons.org/licenses/by/4.0/
- OpenStax University Physics Volume 3 `6de0ec7da7ffa90e1972946d896d1c5507d3799a` https://github.com/cnx-user-books/cnxbook-university-physics-volume-3, CC BY 4.0, Samuel J. Ling, Jeff Sanny, William Moebs; OpenStax, Rice University. Access for free at https://openstax.org. License: `third-party/openstax-CC-BY-4.0.txt`.

`build-science-corpus.py` documents the reproducible extraction and deterministic sample selection. It expects the exact revisions checked out under `/tmp/jarvis-mathlib`, `/tmp/jarvis-theoria`, and `/tmp/jarvis-physics3`. The separately generated notices retain source file header blocks for included mathlib excerpts. The corpus downloads on the first explicit science-library command, not at app startup; mobile offline use and memory behavior have not been tested on the target device.
