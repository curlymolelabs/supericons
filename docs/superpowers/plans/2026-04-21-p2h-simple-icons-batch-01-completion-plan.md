# Simple Icons Batch 01 Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully close Simple Icons batch 01 by approving the remaining straightforward brand records and resolving the small set of ambiguous brand names.

**Architecture:** Reuse the batch-01 staging output, add a reusable editor-review batch builder for later Simple Icons batches, and add a small ambiguity-resolution batch for the handful of short or generic brand names that need stronger wording.

**Tech Stack:** Node.js scripts, JSON registry artifacts, existing SI record normalization and registry projection pipeline

---

## Scope

This step finishes `simpleicons-batch-01`.

It includes:
- the remaining `ready_for_editor_review` records
- the small escalated brand-name set
- approval rebuild and registry rebuild

It does not include:
- `simpleicons-batch-02`
- other libraries
- search logic changes

## Work Items

### 1. Reusable editor-review batching
- upgrade the Simple Icons editor-review builder so it can create later review batches without overwriting earlier ones
- exclude records already decided in previous Simple Icons batches

### 2. Batch 02 approval slice
- build and approve the remaining straightforward batch-01 brand records

### 3. Ambiguity resolution
- review the small set of ambiguous names
- strengthen the wording so they are clearly official brand marks
- then approve or hold them honestly

### 4. Verification
- rebuild approved records
- rebuild registry projections
- verify registry and full build

## Expected Result

At the end of this step:
- `simpleicons-batch-01` is fully processed
- no staged batch-01 records remain unresolved
- the free registry count increases again
- the repo is ready to stage `simpleicons-batch-02`
