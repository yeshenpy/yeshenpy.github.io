(() => {
    "use strict";

    const canObserve = "IntersectionObserver" in window;

    function observeOnce(elements, load, rootMargin = "600px 0px") {
        if (!elements.length) return;
        if (!canObserve) {
            elements.forEach(load);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                load(entry.target);
            });
        }, { rootMargin });
        elements.forEach((element) => observer.observe(element));
    }

    const mediaNodes = Array.from(document.querySelectorAll(".row-media[data-bg]"));
    observeOnce(mediaNodes, (element) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
            element.style.backgroundImage = `url("${element.dataset.bg}")`;
            element.classList.add("is-loaded");
        };
        image.onerror = () => element.classList.add("is-loaded");
        image.src = element.dataset.bg;
    });

    const cacheKey = "github-stars-cache-v2";
    const maxCacheAgeMs = 6 * 60 * 60 * 1000;
    const starNodes = Array.from(document.querySelectorAll(".stars[data-repo]"));
    const pendingRepos = new Set();
    let cache = {};

    try {
        cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");
    } catch (error) {
        cache = {};
    }

    function updateStars(repo, count) {
        document.querySelectorAll(`.stars[data-repo="${repo}"]`).forEach((node) => {
            node.textContent = ` ⭐ ${Number(count).toLocaleString("en-US")}`;
            node.title = "GitHub stars";
        });
    }

    function saveStarCache() {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (error) {
            // The live value is still shown when storage is unavailable.
        }
    }

    starNodes.forEach((node) => {
        const cached = cache[node.dataset.repo];
        if (cached && typeof cached.count === "number") updateStars(node.dataset.repo, cached.count);
    });

    observeOnce(starNodes, (node) => {
        const repo = node.dataset.repo;
        const cached = cache[repo];
        if (cached && Date.now() - cached.updatedAt < maxCacheAgeMs) return;
        if (pendingRepos.has(repo)) return;
        pendingRepos.add(repo);

        fetch(`https://api.github.com/repos/${repo}`, {
            headers: { Accept: "application/vnd.github+json" }
        })
            .then((response) => {
                if (!response.ok) throw new Error(`GitHub API ${response.status}`);
                return response.json();
            })
            .then((data) => {
                if (typeof data.stargazers_count !== "number") return;
                cache[repo] = { count: data.stargazers_count, updatedAt: Date.now() };
                updateStars(repo, data.stargazers_count);
                saveStarCache();
            })
            .catch(() => {
                if (cached && typeof cached.count === "number") updateStars(repo, cached.count);
            })
            .finally(() => pendingRepos.delete(repo));
    }, "800px 0px");

})();
