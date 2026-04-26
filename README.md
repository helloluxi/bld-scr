# 3BLD Scrambler

A 3x3 scramble generator for blindfolded cubers, filtered by the **structure of the BLD solution** instead of by random chance. Pick exactly the kind of memo you want to drill — parity, flip/twist count, cycle breaks, floating 3-cycles, total alg count — and the tool generates scrambles that match.

**Live demo:** <https://helloluxi.github.io/bld-scr>

Buffers are fixed at **UF** (edges) and **UFR** (corners). Scramble in your own orientation.

## Features

- **Basic** — slider-based filters for parity, flips/twists, cycle breaks, float 3-style, and alg count.
- **Advanced** — write a JavaScript boolean expression over the cycle structure for arbitrary filters. Per-field history, shareable URLs.
- **Stat** — plot the distribution of any numeric expression (e.g. `breaks`, `open1`, `algs`) across all scrambles, separately for edges and corners.
- **About** — in-app explanation of concepts and variables.

Hitting *Scramble!* updates the URL so you can bookmark or share your current setup.

## How it works

Every cycle configuration of 12 edges and 8 corners is enumerated up front, with exact scramble counts per configuration. Sampling draws from this weighted distribution and solves the resulting state with [min2phase](https://github.com/cs0x7f/min2phase). The full math — cycle counting, scramble weights, parity, alg estimation — is on the [How It Works](help.html) page.

## Files

| File | Purpose |
| --- | --- |
| `index.html` / `src/index.js` | Main UI and filter logic |
| `help.html` | Math write-up and big-BLD statistics |
| `src/cycler.js` | Enumerates 3BLD cycle configurations and computes scramble counts |
| `src/cycler4.js` | Enumerates 4BLD wing/center configurations |
| `src/scrambler.js` | Samples a configuration and instantiates a random scramble |
| `src/chart.js` | Bar-chart rendering helpers |
| `src/min2phase.js` | Solver used to turn a cube state into a move sequence |
| `src/theme.js` | Dark/light theme toggle |
| `src/reproduction.js` | Node script that prints all reproduced statistics |
| `styles.css` | Shared styles |

## Related

[LuTimer](https://helloluxi.github.io/ufufr) — a more serious BLD training timer by the same author.

## Credits

The bundled `min2phase.js` is a lightly modified copy of [cs0x7f/min2phase.js](https://github.com/cs0x7f/min2phase.js), licensed under GPL-3.0.

## License

GPL-3.0. See [LICENSE](LICENSE). This project inherits GPL-3.0 from the bundled `min2phase.js`.
