# Reality RPG MVP (Vertical Slice)

This repository now includes an initial Expo React Native MVP that implements the first gameplay loop:

1. Capture/select a "before" room photo.
2. Run a mocked Spirit Lens scan to generate quest cards.
3. Accept a quest, capture/select an "after" photo, and verify completion.
4. Gain XP, level up, and persist player progression locally.

## Quick Start

```bash
npm install
npm run start
```

## Current Scope

*   Mobile UI shell with narrative dialogue + player stats.
*   Mock AI vision service for quest generation and before/after verification.
*   RPG progression (XP, levels, attributes, gold) with local persistence.
*   Guild and social raid systems marked as next milestone.

---

# Product Requirements Document (PRD): Reality RPG (Gamify Your Existence)

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-02-17

---

## 1. Executive Summary
**Reality RPG** is a mobile application that transforms mundane daily life into an immersive Visual Novel / RPG experience. Unlike traditional gamified to-do lists (e.g., Habitica) that rely on manual input, Reality RPG leverages **AI Computer Vision** to automatically detect tasks from photos. Users simply snap a picture of their messy environment, and the app identifies "Quests," assigns XP rewards, and wraps the activity in a compelling narrative layer.

**The Vision:** To turn the "drudgery of adulting" into a source of dopamine and narrative progression.

---

## 2. Problem Statement
*   **Boredom:** Daily chores (cleaning, laundry, dishes) are repetitive and lack immediate gratification.
*   **Friction:** Existing gamified apps require users to manually type in tasks ("Wash dishes") and then manually check them off, which feels like work in itself.
*   **Lack of Immersion:** Most productivity apps are just spreadsheets with a fantasy skin; they lack a genuine Story Mode for real life.

## 3. Product Solution
A "Life Overlay" interface that combines:
1.  **The Lens (AI Vision):** Point your camera at a mess -> AI identifies the "Monsters" (Dirty Laundry, Stack of Dishes).
2.  **The Quest System:** Chaos is quantified into XP, Attributes (Willpower, Strength), and Loot.
3.  **The Visual Novel Layer:** Completing tasks advances a personal storyline with branching dialogue and character development.

---

## 4. User Personas

### 4.1. The Procrastinating Hero (Primary)
*   **Demographics:** Gen Z / Millennial, tech-savvy, enjoys gaming/anime.
*   **Pain Point:** Struggles with executive dysfunction or finding motivation for cleaning.
*   **Goal:** Wants a fun reason to get off the couch.
*   **Scenario:** See a pile of clothes. Opens app. App says "A Level 3 Laundry Golem blocks your path." They clean it to level up.

### 4.2. The Guild Leader (Secondary)
*   **Demographics:** Student living in a dorm or young professional in a shared flat.
*   **Pain Point:** Roommate arguments over chores.
*   **Goal:** A passive-aggressive-free way to manage shared spaces.
*   **Scenario:** Snaps a photo of the dirty kitchen. Posts a "Guild Raid" to the house chat. Everyone gets XP for helping clean users.

---

## 5. Functional Requirements

### 5.1. Core Loop: The "Snapshot" Mechanic
*   **FR-1.0:** User opens camera interface ("The Spirit Lens").
*   **FR-1.1:** App analyzes image using AI (e.g., vision-to-text model).
*   **FR-1.2:** AI identifies objects/states:
    *   *Pile of Clothes* -> "Laundry Monster"
    *   *Dirty Dishes* -> "Hydra of Grime"
    *   *Unmade Bed* -> "The Wrinkled Wasteland"
*   **FR-1.3:** App generates a "Quest Card" with:
    *   Quest Name
    *   Time Estimate
    *   XP Reward & Attribute Buff (e.g., +10 Willpower)

### 5.2. Verification System
*   **FR-2.0:** User completes the chore.
*   **FR-2.1:** User snaps an "After" photo.
*   **FR-2.2:** AI compares "Before" and "After" to verify the task is done.
*   **FR-2.3:** "Quest Complete" release animation (dopamine hit) and XP allocation.

### 5.3. RPG & Narrative Elements
*   **FR-3.0:** **Visual Novel Interface:**
    *   Main screen is not a list, but a "Bedroom" or "Hub" scene.
    *   NPCs (AI companions) comment on the state of your room (e.g., "It's getting cleaner in here, Hero!").
*   **FR-3.1:** **Leveling System:**
    *   XP gains unlock new "Chapters" in the story.
    *   Attributes: Strength (Heavy lifting), Intellect (Organizing), Charisma (Social events), Willpower (Boring tasks).
*   **FR-3.2:** **Classes:**
    *   *Cleaner* (Bonus XP for tidying)
    *   *Organizer* (Bonus XP for administrative tasks)
    *   *Chef* (Bonus XP for cooking/dishes)

### 5.4. Social (Guilds)
*   **FR-4.0:** Create/Join a Guild (Household).
*   **FR-4.1:** **Raids:** A massive mess (e.g., "Post-Party Living Room") requires multiple users to contribute "Before/After" photos to defeat the Boss.
*   **FR-4.2:** Leaderboards for "Most Damage Dealt" (Most cleaning done).

---

## 6. Example Narrative Flow
**Scene:** The user's bedroom. A pile of clothes is on the chair.
**Visuals:** The room is engagingly rendered in a 2D anime style, but dark and gloomy due to the "Mess Corruption."
**NPC (The Spirit Guide - A snarky floating cat):**
> "Ugh, look at that. The Laundry Golem has fortified its position on 'The Chair'. It's draining your room's Feng Shui mana. Are you going to let it win, or are you going to banish it to the Washing Machine Dimension?"
**Action:** User snaps a photo of the clothes.
**System:** "Quest Accepted: The Cotton Exorcism. Reward: 50 XP, +2 Charisma."
**Action:** User cleans the clothes and snaps an 'After' photo.
**System:** "Victory! The Chair is reclaimed. The gloom lifts."
**NPC:**
> "Not bad, hero. You might essentially be a functioning adult after all. Here's 50 Gold. Go buy yourself a potion (coffee)."

---

## 7. Technical Feasibility
*   **AI Vision Pipeline:**
    *   **Input:** User camera feed/photo.
    *   **Processing:**
        *   *Option A (Cloud):* GPT-4o or similar VLM (Vision Language Model) for high-context understanding ("This is a messy desk with coffee cups"). High accuracy, higher latency/cost.
        *   *Option B (On-Device):* Fine-tuned YOLO/EfficientNet for specific classes (Laundry, Dishes, Trash). Low latency, privacy-first, offline capable.
        *   *Hybrid Approach:* On-device for detection, Cloud for witty "Visual Novel" descriptions.
*   **Game Engine:** Unity or Godot for the visual novel layer, embedded within a Flutter/React Native app for the productivity UI.

---

## 8. Monetization Strategy
*   **Freemium:** Core loop is free.
*   **Cosmetics:** Skins for the interface, different Spirit Guides (Cat, Dragon, Tech-Support Guy).
*   **Subscription (Hero's License):** Access to Cloud-based extensive narrative generation (infinite unique quest descriptions).

---

## 9. Non-Functional Requirements
*   **Privacy:** Photos must be processed locally or on secure, ephemeral cloud instances. No photos saved permanently without user consent.
*   **Latency:** Quest generation from photo must occur within <3 seconds to maintain flow.
*   **Aesthetics:** High-quality 2D art assets, catchy chiptune/lo-fi sound design.

---

## 10. UI/UX Concepts
*   **The Lens:** AR overlay. When pointing at a trash can, a floating health bar appears above it.
*   **Dialogue Boxes:** Typical Visual Novel style (character sprite on left/right, text box at bottom) for quest/reward notifications.
*   **SFX:** Retro game sounds for "Scanning," "Quest Accept," and "Level Up."

---

## 11. Risks & Mitigation
*   **Risk:** AI cheating (User snaps photo of clean floor but didn't clean it).
    *   *Mitigation:* "After" photo timestamp checks and similarity analysis (ensure it's the *same* room).
*   **Risk:** AI failure (Does not recognize the mess).
    *   *Mitigation:* Manual override option ("I'm cleaning the floor") but with reduced XP to encourage using the lens.
*   **Risk:** User fatigue.
    *   *Mitigation:* Daily "Energy" cap or "Rest Bonuses" to prevent burnout; Seasonal events.

---

## 12. Future Scope (Roadmap)
*   **Phase 2:** Wearable integration (Apple Watch step count = "Patrol Quest").
*   **Phase 3:** Brand Partnerships (Cleaning product coupons as "Loot drops").
*   **Phase 4:** Battle Mode (PvP cleaning contests).
