# Agent Execution Log

Central log tracking all agent executions, statuses, and errors.

## Log Format

| Timestamp | Agent | Status | Duration | Findings | Errors |
|-----------|-------|--------|----------|----------|--------|
| [ISO timestamp] | [agent-name] | COMPLETE/PARTIAL/SKIPPED/ERROR | [seconds] | [count] | [error list] |

---

## Execution History

<!-- Agents append their status here after each run -->

| Timestamp | Agent | Status | Duration | Findings | Errors |
|-----------|-------|--------|----------|----------|--------|
| | | | | | |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| COMPLETE | All checks ran successfully |
| PARTIAL | Some checks ran, some skipped |
| SKIPPED | Agent couldn't run (prerequisites not met) |
| ERROR | Agent encountered errors during execution |

## Last Full Audit

**Date:** (not yet run)
**Agents Run:** 0/24
**Total Findings:** 0
**Critical Issues:** 0

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Runs | 0 |
| Successful | 0 |
| Failed | 0 |
| Avg Duration | - |

---

## Notes

- Each agent appends to this log after execution
- Review this log to identify failing agents
- Check `errors` column for root cause analysis
- Clear old entries periodically (keep last 30 days)
