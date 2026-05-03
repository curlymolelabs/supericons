# Natural Language Intent Dictionary Policy

## Purpose

SuperIcons search should understand natural human words that do not literally appear in icon names or registry tags.

Examples include aesthetic words such as `beautiful`, judgment words such as `stupid`, and product words such as `deployment`.

## Source Of Truth

The production source of truth is `data/search-intent-dictionary/search-intent-dictionary.json`.

External lexical resources may suggest candidates, but they do not publish directly into search behavior.

## External Sources

Allowed suggestion sources:

- WordNet-style lexical relations
- Datamuse related-word suggestions
- ConceptNet-style conceptual associations
- Embedding similarity checks

These sources are used only during offline maintenance.

## Approval Rule

Every production mapping must be reviewed for:

- Does the mapped icon concept make sense to a normal human?
- Could the word have a harmful or insulting interpretation?
- Does the mapping improve search without hiding better literal matches?
- Does the mapping avoid polluting `depicts` or literal icon tags?

## Example

`stupid` should map to mistake, error, or confused-state icons, not to a person or identity.

Good concepts:

- bug
- warning
- x circle
- confused face
- brain off

Avoid concepts:

- user
- profile
- check
- brain circuit
