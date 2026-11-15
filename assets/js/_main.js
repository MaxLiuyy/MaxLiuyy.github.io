/* ==========================================================================
   Various functions that we want to use within the template
   ========================================================================== */

/*jslint es6 */
'use strict';

// Constants for CDNs
const PLOTLY_URL = "https://cdn.jsdelivr.net/npm/plotly.js@3.6.0/dist/plotly.min.js";
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/mermaid.esm.min.mjs";
// Mermaid's bundled ELK layout; its file name changes with every Mermaid release, so update both together
const MERMAID_ELK_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.2.0/dist/chunks/mermaid.esm.min/elk-7HBNN7NY.mjs";

// Detect OS/browser preference
const darkQuery = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

// Determine the computed theme, which can be "dark" or "light". The site always follows the OS/browser preference.
function determineComputedTheme() {
  return darkQuery && darkQuery.matches ? "dark" : "light";
}

// Set the theme on page load or when explicitly called. Without an argument the
// theme is the OS/browser preference.
function setTheme(theme) {
  const use_theme = theme || determineComputedTheme();

  if (use_theme === "dark") {
    $("html").attr("data-theme", "dark");
  } else if (use_theme === "light") {
    $("html").removeAttr("data-theme");
  }
}

// Mermaid config: the base theme in the site's grays and serif font, picked for the color scheme
// at page load, and the ELK layout with network-simplex node placement and wider edge spacing
function mermaidConfig(theme) {
  const colors = (theme === "dark")
    ? { background: "#121212", primaryColor: "#1e1e1e", primaryBorderColor: "#5a5a5a", primaryTextColor: "#ccc9c3",
        secondaryColor: "#242424", tertiaryColor: "#121212", lineColor: "#8a8a8a",
        edgeLabelBackground: "#121212", clusterBkg: "#1a1a1a", clusterBorder: "#3b3d3e" }
    : { background: "#ffffff", primaryColor: "#f7f7f8", primaryBorderColor: "#b8b8b8", primaryTextColor: "#3f4448",
        secondaryColor: "#f2f3f3", tertiaryColor: "#ffffff", lineColor: "#8a8f94",
        edgeLabelBackground: "#ffffff", clusterBkg: "#fafafa", clusterBorder: "#e0e0e0" };
  return {
    startOnLoad: true,
    theme: "base",
    darkMode: theme === "dark",
    layout: "elk-wide",
    elk: { nodePlacementStrategy: "NETWORK_SIMPLEX" },
    flowchart: { curve: "rounded" },
    themeVariables: {
      fontFamily: '"Noto Serif", "Noto Serif SC Text", "Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif',
      fontSize: "15px",
      ...colors,
    },
  };
}

// Defer the loading of Mermaid to only if there is a field on the page to be rendered
let mermaidElements = document.querySelectorAll("pre>code.language-mermaid");
if (mermaidElements.length > 0) {
  document.addEventListener("readystatechange", function() {
    // Append the Mermaid module to the DOM
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = `
      import mermaid from '${MERMAID_URL}';
      // Mermaid hard-codes ELK's edge spacing (20 between edges, 30 to nodes), so "elk-wide"
      // wraps its ELK layout to keep edges further apart
      const spacing = {"elk.spacing.edgeEdge": 36, "elk.layered.spacing.edgeEdgeBetweenLayers": 30,
        "elk.spacing.edgeNode": 30, "elk.layered.spacing.edgeNodeBetweenLayers": 36};
      mermaid.registerLayoutLoaders([{name: "elk-wide", algorithm: "elk.layered", loader: async () => {
        const elk = await import('${MERMAID_ELK_URL}');
        return {render: (data, svg, helpers, options) =>
          elk.render(data, svg, helpers, {...options, rootLayoutOptions: spacing})};
      }}]);
      mermaid.initialize(${JSON.stringify(mermaidConfig(determineComputedTheme()))});
      await mermaid.run({querySelector:'code.language-mermaid'});
    `;
    document.body.appendChild(moduleScript);
  });
}

/* ==========================================================================
   Plotly integration script so that Markdown codeblocks will be rendered
   ========================================================================== */

// Read the Plotly data from the code block, hide it, and render the chart as new node. This allows for the
// JSON data to be retrieve when the theme is switched. The listener should only be added if the data is
// actually present on the page.
//
// NOTE that plotlyDarkLayout and plotlyLightLayout will be exposed in the minimized file
let plotlyElements = document.querySelectorAll("pre>code.language-plotly");
if (plotlyElements.length > 0) {
  document.addEventListener("readystatechange", function() {
    // Return if not ready
    if (document.readyState !== "complete") {
      return;
    }

    // Prepare to load Plotly from the CDN
    const script = document.createElement('script');
    script.src = PLOTLY_URL;
    script.async = true;

    // Once loaded, update the page elements to work with it
    script.onload = function() {
      plotlyElements.forEach(function(elem) {
        // Parse the Plotly JSON data and hide it
        let jsonData = JSON.parse(elem.textContent);
        elem.parentElement.classList.add("hidden");

        // Add the Plotly node
        let chartElement = document.createElement("div");
        elem.parentElement.after(chartElement);

        // Set the theme for the plot and render it
        const theme = (determineComputedTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;
        if (jsonData.layout) {
          jsonData.layout.template = (jsonData.layout.template) ? { ...theme, ...jsonData.layout.template } : theme;
        } else {
          jsonData.layout = { template: theme };
        }
        Plotly.react(chartElement, jsonData.data, jsonData.layout);
      });
    }

    // Add the script to the document
    document.head.appendChild(script);
  });
}

function redrawPlotly() {
  plotlyElements.forEach(function(elem) {
    // Parse the Plotly JSON data
    let jsonData = JSON.parse(elem.textContent);

    // Get the Plotly node
    let chartElement = $(elem).parent().next().get(0);

    // Set the theme for the plot and render it
    const theme = (determineComputedTheme() === "dark") ? plotlyDarkLayout : plotlyLightLayout;
    if (jsonData.layout) {
      jsonData.layout.template = (jsonData.layout.template) ? { ...theme, ...jsonData.layout.template } : theme;
    } else {
      jsonData.layout = { template: theme };
    }
    Plotly.react(chartElement, jsonData.data, jsonData.layout);
  });
}

/* ==========================================================================
   Actions that should occur when the page has been fully loaded
   ========================================================================== */

$(document).ready(function () {
  // Kramdown supplies the permalink; move it after the heading when scripts run.
  document.querySelectorAll(":is(.page__content, .archive) :is(h1, h2, h3, h4, h5, h6)[id]").forEach(heading => {
    const link = heading.firstElementChild;
    if (link && link.matches("a[href^='#']:empty") && link.getAttribute("href") === "#" + heading.id) {
      link.classList.add("heading-permalink");
      link.setAttribute("aria-label", "Permalink");
      heading.appendChild(link);
    }
  });

  // Post table of contents: every heading in the post, indented one step per level below the
  // highest level used, shown once there are at least two; the section being read is marked as current.
  const toc = document.querySelector(".page__toc");
  if (toc) {
    const entries = [...document.querySelectorAll(".page__content :is(h1, h2, h3, h4, h5, h6)[id]")];
    const levels = [...new Set(entries.map(heading => heading.tagName))].sort();
    if (entries.length >= 2) {
      const list = toc.querySelector("ul");
      const links = entries.map(heading => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = "#" + heading.id;
        link.textContent = heading.textContent.trim();
        item.style.setProperty("--toc-depth", levels.indexOf(heading.tagName));
        item.appendChild(link);
        list.appendChild(item);
        return link;
      });
      toc.hidden = false;

      const markCurrent = () => {
        const top = 90;  // just below the masthead
        let current = 0;
        entries.forEach((heading, i) => {
          if (heading.getBoundingClientRect().top <= top) current = i;
        });
        // A short last section never reaches the top; at the bottom of the page it is the one being read
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
          current = entries.length - 1;
        }
        links.forEach((link, i) => {
          if (i === current) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      };
      window.addEventListener("scroll", markCurrent, { passive: true });
      markCurrent();
    }
  }

  // SCSS SETTINGS - These should be the same as the settings in the relevant files
  const scssLarge = 925;          // pixels, from /_sass/_themes.scss
  const scssMastheadHeight = 70;  // pixels, from the current theme (e.g., /_sass/theme/_default.scss)

  // Follow the OS preference, including changes while the page is open
  setTheme();
  darkQuery && darkQuery.addEventListener("change", (e) => {
    setTheme(e.matches ? "dark" : "light");
    redrawPlotly();
  });

  // Enable the sticky footer
  var bumpIt = function () {
    $("body").css("padding-bottom", "0");
    $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
  }
  $(window).resize(function () {
    didResize = true;
  });
  setInterval(function () {
    if (didResize) {
      didResize = false;
      bumpIt();
    }}, 250);
  var didResize = false;
  bumpIt();

  // Follow menu drop down
  $(".author__urls-wrapper button").on("click", function () {
    $(".author__urls").fadeToggle("fast", function () { });
    $(".author__urls-wrapper button").toggleClass("open");
  });

  // Restore the follow menu if toggled on a window resize
  jQuery(window).on('resize', function () {
    if ($('.author__urls.social-icons').css('display') == 'none' && $(window).width() >= scssLarge) {
      $(".author__urls").css('display', 'block')
    }
  });

});
