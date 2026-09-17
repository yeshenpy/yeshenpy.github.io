# Pengyi-Li.github.io
Repository for [my personal site](https://yeshenpy.github.io/), built with plain html.

## Local preview

Run `python -m http.server 8765 --bind 127.0.0.1` in this directory and open
<http://127.0.0.1:8765/>. No build step or package installation is required.

## Header particles

`particles.js` draws a glowing wave grid with attraction interaction. Hover over
it to gather nearby particles; click or tap to pull them in and release them.
The page uses only this effect, with no mode selectors or comparison controls.

The grid uses up to 1768 desktop points or 612 mobile points, with a lighter
profile for low-power devices. Glow sprites are reused, and at most eight click
pulses are retained. `drawWaves()` controls the grid and motion. Animation pauses
when the header is out of view or the tab is hidden. Visitors who prefer reduced
motion see a static field. The canvas does not intercept links or scrolling.

## Performance

The hero uses optimized WebP assets and a lower-resolution canvas on dense
screens. Publication thumbnails and GitHub star requests load only when they
approach the viewport. The visitor globe loads with the page for compatibility
with the MapMyVisitors embed. `site.js` contains the progressive loading helpers.
No dependencies or build step are needed.

If you're reading this, you're probably interested in creating a personal site similar to what I have built. You are very welcome to clone this repository and built off of my work. Feel free to link back to my page if you decide to clone, but don't feel obligated. I'm also happy to receive PRs if you have ideas or suggestions on how to improve my site. If you want to learn more about GitHub Pages, [this](https://pages.github.com/) is a great place to start.
