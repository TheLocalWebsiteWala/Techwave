/* Tech Wave — shared behaviour: reveal, parallax, header, nav, cart, store,
   product detail, accordion, search, forms. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  var products = window.TW_PRODUCTS || [];
  var articles = window.TW_ARTICLES || [];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function money(n) {
    return "$" + n.toFixed(2) + " USD";
  }
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }
  function byId(id) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  /* ---------- active nav ------------------------------------------- */
  function markActiveNav() {
    var file = window.location.pathname.split("/").pop() || "index.html";
    $$("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === file.replace(".html", "")) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- header + mobile nav ---------------------------------- */
  function initHeader() {
    var header = $(".header");
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-stuck", window.scrollY > 12);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    var burger = $(".burger");
    if (burger) {
      burger.addEventListener("click", function () {
        document.body.classList.toggle("nav-open");
        burger.setAttribute(
          "aria-expanded",
          document.body.classList.contains("nav-open") ? "true" : "false"
        );
      });
      $$(".mobile-nav a").forEach(function (a) {
        a.addEventListener("click", function () {
          document.body.classList.remove("nav-open");
        });
      });
    }
  }

  /* ---------- scroll reveal ---------------------------------------- */
  function initReveal() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    // stagger children of any [data-stagger] container
    $$("[data-stagger]").forEach(function (group) {
      $$("[data-reveal]", group).forEach(function (child, i) {
        child.style.transitionDelay = Math.min(i, 8) * 80 + "ms";
      });
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ---------- hero cursor parallax --------------------------------- */
  function initParallax() {
    var stage = $(".floaties");
    if (!stage || reduce) return;
    var cards = $$(".floatie", stage);
    var tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = null;

    function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      cards.forEach(function (card, i) {
        var depth = (i % 3) + 1;
        card.style.setProperty(
          "--px",
          (cx * depth * 8).toFixed(2) + "px"
        );
        card.style.translate =
          (cx * depth * 9).toFixed(2) + "px " + (cy * depth * 9).toFixed(2) + "px";
      });
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener(
      "pointermove",
      function (e) {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
        if (!raf) raf = requestAnimationFrame(loop);
      },
      { passive: true }
    );
  }

  /* ---------- cart -------------------------------------------------- */
  function cartCount() {
    return parseInt(localStorage.getItem("tw_cart") || "0", 10) || 0;
  }
  function renderCart() {
    var n = cartCount();
    $$(".cart-count").forEach(function (el) {
      el.textContent = String(n);
      el.classList.toggle("is-visible", n > 0);
    });
  }
  function addToCart(qty) {
    localStorage.setItem("tw_cart", String(cartCount() + (qty || 1)));
    renderCart();
  }

  /* ---------- card markup ------------------------------------------ */
  function productCard(p, withDesc) {
    return (
      '<a class="card" data-reveal href="product.html?id=' +
      p.id +
      '">' +
      '<div class="card__media"><span class="card__tag">' +
      p.category +
      '</span><img loading="lazy" src="' +
      p.image +
      '" alt="' +
      p.name +
      '"></div>' +
      '<div class="card__body"><div class="card__title">' +
      p.name +
      "</div>" +
      (withDesc ? '<p class="card__desc">' + p.desc + "</p>" : "") +
      '<div class="card__price">' +
      money(p.price) +
      "</div></div></a>"
    );
  }

  function articleCard(a) {
    return (
      '<a class="article-card" data-reveal href="article.html?slug=' +
      a.slug +
      '">' +
      '<div class="article-card__media"><img loading="lazy" src="' +
      a.image +
      '" alt="' +
      a.title +
      '"></div>' +
      '<div class="article-card__date">' +
      a.date +
      "</div><h3>" +
      a.title +
      "</h3><p>" +
      a.excerpt +
      "</p></a>"
    );
  }

  /* ---------- home grids -------------------------------------------- */
  function initHome() {
    var best = $("#bestsellers");
    if (best) {
      best.innerHTML = products.slice(0, 4).map(function (p) {
        return productCard(p, true);
      }).join("");
    }
    var featured = $("#featured");
    if (featured) {
      featured.innerHTML = products.slice(4, 8).map(function (p) {
        return productCard(p, false);
      }).join("");
    }
    var news = $("#home-articles");
    if (news) {
      news.innerHTML = articles.slice(0, 2).map(articleCard).join("");
    }
  }

  /* ---------- store -------------------------------------------------- */
  function initStore() {
    var grid = $("#store-grid");
    if (!grid) return;
    var chips = $$(".chip");
    var sort = $("#sort");
    var count = $("#result-count");
    var active = param("category") || "All";

    function render() {
      var list = products.filter(function (p) {
        return active === "All" || p.category === active;
      });
      var mode = sort ? sort.value : "featured";
      if (mode === "price-asc") list.sort(function (a, b) { return a.price - b.price; });
      if (mode === "price-desc") list.sort(function (a, b) { return b.price - a.price; });
      if (mode === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (mode === "newest") list.sort(function (a, b) { return b.date.localeCompare(a.date); });

      grid.innerHTML = list.length
        ? list.map(function (p) { return productCard(p, true); }).join("")
        : '<p class="empty">No products in this category yet.</p>';
      if (count) {
        count.textContent = list.length + (list.length === 1 ? " product" : " products");
      }
      chips.forEach(function (c) {
        c.classList.toggle("is-active", c.dataset.filter === active);
      });
      initReveal();
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        active = c.dataset.filter;
        render();
      });
    });
    if (sort) sort.addEventListener("change", render);
    render();
  }

  /* ---------- product detail ---------------------------------------- */
  function initProduct() {
    var root = $("#pdp");
    if (!root) return;
    var p = byId(param("id")) || products[0];
    document.title = p.name + " — Tech Wave";

    $("#pdp-name").textContent = p.name;
    $("#pdp-cat").textContent = p.category;
    $("#pdp-price").textContent = money(p.price);
    $("#pdp-desc").textContent = p.desc;
    var stage = $("#pdp-image");
    stage.src = p.image;
    stage.alt = p.name;

    var related = products.filter(function (x) {
      return x.id !== p.id;
    }).slice(0, 4);

    $("#pdp-thumbs").innerHTML = [p].concat(related.slice(0, 3)).map(function (x, i) {
      return (
        '<button class="thumb' + (i === 0 ? " is-active" : "") +
        '" data-src="' + x.image + '" aria-label="View ' + x.name +
        '"><img src="' + x.image + '" alt=""></button>'
      );
    }).join("");

    $$("#pdp-thumbs .thumb").forEach(function (t) {
      t.addEventListener("click", function () {
        $$("#pdp-thumbs .thumb").forEach(function (o) { o.classList.remove("is-active"); });
        t.classList.add("is-active");
        stage.style.opacity = "0";
        setTimeout(function () {
          stage.src = t.dataset.src;
          stage.style.opacity = "1";
        }, 180);
      });
    });

    $("#pdp-specs").innerHTML = p.specs.map(function (s) {
      return '<div class="spec"><span>' + s[0] + "</span><span>" + s[1] + "</span></div>";
    }).join("");

    $("#pdp-related").innerHTML = related.map(function (x) {
      return productCard(x, false);
    }).join("");

    var out = $("#qty");
    var qty = 1;
    $("#qty-minus").addEventListener("click", function () {
      qty = Math.max(1, qty - 1);
      out.value = qty;
    });
    $("#qty-plus").addEventListener("click", function () {
      qty = Math.min(20, qty + 1);
      out.value = qty;
    });
    $("#add-to-cart").addEventListener("click", function () {
      addToCart(qty);
      var note = $("#pdp-note");
      note.textContent = qty + " × " + p.name + " added to your bag.";
      note.className = "form-note is-success";
    });

    // tabs
    $$(".tabs__nav button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".tabs__nav button").forEach(function (b) { b.classList.remove("is-active"); });
        $$(".tabs__panel").forEach(function (pnl) { pnl.classList.remove("is-active"); });
        btn.classList.add("is-active");
        $("#" + btn.dataset.tab).classList.add("is-active");
      });
    });

    initReveal();
  }

  /* ---------- articles ---------------------------------------------- */
  function initArticles() {
    var grid = $("#articles-grid");
    if (grid) grid.innerHTML = articles.map(articleCard).join("");

    var root = $("#article-body");
    if (root) {
      var slug = param("slug");
      var a = articles.filter(function (x) { return x.slug === slug; })[0] || articles[0];
      document.title = a.title + " — Tech Wave";
      $("#article-title").textContent = a.title;
      $("#article-date").textContent = a.date;
      var img = $("#article-image");
      img.src = a.image;
      img.alt = a.title;
      $("#article-lead").textContent = a.excerpt;
      var more = $("#article-more");
      if (more) {
        more.innerHTML = articles.filter(function (x) { return x.slug !== a.slug; })
          .map(articleCard).join("");
      }
    }
  }

  /* ---------- accordion --------------------------------------------- */
  function initAccordion() {
    $$(".acc__item").forEach(function (item) {
      var btn = $(".acc__btn", item);
      var panel = $(".acc__panel", item);
      btn.addEventListener("click", function () {
        var open = item.classList.contains("is-open");
        $$(".acc__item.is-open").forEach(function (other) {
          other.classList.remove("is-open");
          $(".acc__panel", other).style.height = "0px";
          $(".acc__btn", other).setAttribute("aria-expanded", "false");
        });
        if (!open) {
          item.classList.add("is-open");
          panel.style.height = panel.scrollHeight + "px";
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------- search suggestions ------------------------------------ */
  function initSearch() {
    $$(".search").forEach(function (wrap) {
      var input = $("input", wrap);
      var box = $(".suggest", wrap);
      if (!input || !box) return;

      function close() {
        box.classList.remove("is-open");
      }

      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        if (q.length < 2) return close();
        var hits = products.filter(function (p) {
          return (p.name + " " + p.category).toLowerCase().indexOf(q) > -1;
        }).slice(0, 5);
        if (!hits.length) return close();
        box.innerHTML = hits.map(function (p) {
          return (
            '<a href="product.html?id=' + p.id + '"><img src="' + p.image +
            '" alt=""><span><strong>' + p.name + "</strong><span>" +
            money(p.price) + "</span></span></a>"
          );
        }).join("");
        box.classList.add("is-open");
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          var first = $("a", box);
          if (first) window.location.href = first.getAttribute("href");
          else window.location.href = "store.html";
        }
        if (e.key === "Escape") close();
      });

      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target)) close();
      });
    });
  }

  /* ---------- forms --------------------------------------------------- */
  function initForms() {
    $$("form[data-form]").forEach(function (form) {
      var note = $(".form-note", form);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var invalid = $$("[required]", form).filter(function (f) {
          return !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
        });
        if (invalid.length) {
          note.className = "form-note is-error";
          note.textContent = "Please fill in every field with a valid value.";
          invalid[0].focus();
          return;
        }
        note.className = "form-note is-success";
        note.textContent = form.dataset.success || "Thanks — we'll be in touch shortly.";
        form.reset();
      });
    });
  }

  /* ---------- boot ---------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", function () {
    markActiveNav();
    initHeader();
    renderCart();
    initHome();
    initStore();
    initProduct();
    initArticles();
    initAccordion();
    initSearch();
    initForms();
    initParallax();
    initReveal();
  });
})();
