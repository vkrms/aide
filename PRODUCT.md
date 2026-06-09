# Product

## Register

product

## Users

A solo developer using AIDE as a personal ADHD accountability partner. The primary interface is Telegram (on mobile, throughout the day), backed by an admin dashboard (on desktop) for managing projects, reminders, and memories. The user is timezone-aware (Asia/Bangkok) and needs the bot to resolve relative times correctly in their local context.

## Product Purpose

AIDE is an AI-powered ADHD accountability bot that helps a single user stay on track with projects, reminders, and persistent memory. It nudges — doesn't nag. The bot checks in daily via Telegram, remembers preferences and past context, and lets the user manage their data through a minimal web dashboard. Success means the user ships tiny pieces of work consistently, not perfectly.

## Brand Personality

**Supportive, playful, calm.** The tone is empathetic and non-judgmental — a friendly coach, not a taskmaster. Slightly playful (the mascot is a pixel-art "mAIDE"), but the playfulness serves warmth, not distraction. Calm because the user already has enough noise; AIDE is the quiet voice that helps them focus on one tiny thing.

## Anti-references

- **Bloated enterprise dashboards** — this is not a team project management tool. No nested menus, no role-based access, no multi-tenant complexity.
- **SaaS-generic admin panels** — no sidebars with 12 nav items, no breadcrumbs, no data-heavy analytics pages with 8 chart widgets.
- **Gamification-heavy apps** — no streaks, no points, no leaderboards. Accountability through gentle presence, not dopamine tricks.
- **Harsh or clinical productivity tools** — no red X marks, no "you failed" language, no cold corporate UI.

## Design Principles

1. **Support, don't judge.** Every interaction should feel encouraging. Error states say "let's try again" not "that failed."
2. **One tiny thing.** The interface should help the user identify a single actionable step. Never overwhelm with everything at once.
3. **Disappear when not needed.** Friction is the enemy. The admin dashboard should be fast and minimal — get in, do the thing, get out.
4. **Playful but not childish.** The mAIDE mascot and warm tone add personality, but never at the expense of clarity or speed.
5. **Bangkok-first.** All time displays and scheduling logic respect Asia/Bangkok timezone. The user should never do mental timezone math.

## Accessibility & Inclusion

- **WCAG AA** as the baseline for the admin dashboard.
- **Color blindness** — status indicators use shape/position in addition to color (the admin tables already use text-based status labels alongside color).
- **Reduced motion** — any future animations must respect `prefers-reduced-motion: reduce`.
- **Readable typography** — body text ≥ 16px, line length capped at 65-75ch on the dashboard.
