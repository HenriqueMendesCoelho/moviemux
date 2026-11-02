# Vue Bits component provenance

`SpotlightCard.vue` is adapted from the actual [Vue Bits SpotlightCard](https://vue-bits.dev/components/spotlight-card), maintained by David Haz, rather than a separately recreated effect.

- Repository: https://github.com/DavidHDev/vue-bits
- Source revision: `3766ebeeed37ec35bce29f001b6d101c7b17da35` (reviewed 2026-11-02).
- Source file: `src/content/Components/SpotlightCard/SpotlightCard.vue`.
- Upstream package metadata reports version `0.0.0`; the exact Git revision pins this copy.
- License: **MIT + Commons Clause**, reproduced in `LICENSE.md`. The upstream license permits use as part of an application, website or product but restricts selling, sublicensing or redistributing the components themselves, including standalone bundles/templates/ports. Do not describe it as plain MIT.

MovieMux adaptations retain the original pointer-position/radial-gradient implementation, replacing Tailwind presentation classes with scoped CSS and the existing design tokens. The highlight is deliberately faint and used only around the login card. No GSAP, WebGL, animation package or other runtime dependency is added.

Content is rendered normally during SSR and without JavaScript. Only the decorative overlay is enhanced after mounting. Coarse pointers, reduced-motion preferences, hidden documents and focused form fields disable the effect. The overlay cannot receive pointer events, adds no focus stop, changes no geometry, and never replaces focus indicators. Lifecycle listeners are removed on unmount.
