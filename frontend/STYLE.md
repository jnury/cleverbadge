# Clever Badge - Brand Design & Color Palette Instructions

This document outlines the official color palette for the "Clever Badge" tech assessment platform based on the approved logo emblem.

**Design Aesthetic:** Professional, high-tech, trustworthy SaaS branding. Clean backgrounds with deep tones and metallic/glowing accents.

---

## Color Palette Data

Below are the primary, secondary, and accent colors derived from the logo.

| Color Swatch | Color Name | Role | Hex Code | RGB Value | CSS Variable Name (Suggested) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| <span style="display:inline-block; width:20px; height:20px; background-color:#1D4E5A; border: 1px solid #ccc;"></span> | **Deep Teal** | Primary Brand Color | `#1D4E5A` | `rgb(29, 78, 90)` | `--color-primary-teal` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#B55C34; border: 1px solid #ccc;"></span> | **Copper** | Primary Accent (Mid Tone) | `#B55C34` | `rgb(181, 92, 52)` | `--color-accent-copper` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#853F21; border: 1px solid #ccc;"></span> | **Dark Copper** | Secondary Accent (Shadow) | `#853F21` | `rgb(133, 63, 33)` | `--color-copper-dark` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#D98C63; border: 1px solid #ccc;"></span> | **Light Copper** | Secondary Accent (Highlight) | `#D98C63` | `rgb(217, 140, 99)` | `--color-copper-light` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#4DA6C0; border: 1px solid #ccc;"></span> | **Tech Blue** | Tertiary Accent (Digital/Focus) | `#4DA6C0` | `rgb(77, 166, 192)` | `--color-accent-tech-blue` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#2A6373; border: 1px solid #ccc;"></span> | **Circuit Blue** | Subtle Background/Border Accent | `#2A6373` | `rgb(42, 99, 115)` | `--color-circuit-blue-subtle` |
| <span style="display:inline-block; width:20px; height:20px; background-color:#FFFFFF; border: 1px solid #ccc;"></span> | **White** | Main Background | `#FFFFFF` | `rgb(255, 255, 255)` | `--color-background-white` |

---

## Implementation Guidelines for AI/Developer

### 1. Typography & Headers
* All primary headers (H1, H2, etc.) and the main brand name text should use **Deep Teal** (`#1D4E5A`).
* Body text should be a dark gray (e.g., `#333333`) for readability against white backgrounds, not pure black.

### 2. Interactive Elements & Buttons
* **Primary Call-to-Action (CTA) Buttons:** Should utilize the **Copper** tones. To mimic the logo's depth, use a subtle linear gradient from **Copper** (`#B55C34`) down to **Dark Copper** (`#853F21`).
* **Secondary Buttons:** Use **Deep Teal** as a solid color or a bordered outline.
* **Hover States:**
    * For Copper buttons, darken towards `#853F21`.
    * For Teal buttons, slightly lighten or add a glow effect using **Tech Blue**.

### 3. Accents & Indicators (The "Tech" Feel)
* **Tech Blue** (`#4DA6C0`) is the "digital" accent. Use it specifically for:
    * Active nav link indicators.
    * Focus states on form inputs.
    * Progress bars or loading spinners.
    * Subtle outer-glow effects on selected items (referencing the fox eye).

### 4. Backgrounds & Borders
* **Main Canvas:** Keep the primary application background **White** (`#FFFFFF`).
* **Subtle Patterns:** If background patterns are needed (like for a hero section banner), use **Circuit Blue** (`#2A6373`) at a very low opacity (e.g., 10-20%) to create faint circuit board lines against a slightly darker teal background, mimicking the inside of the shield.
* **Borders:** Use **Circuit Blue** for subtle dividers or card borders that need more definition than a standard gray.