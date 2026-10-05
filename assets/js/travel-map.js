(function () {
  "use strict";

  var MAP_WIDTH = 1200;
  var MAP_HEIGHT = 640;
  var MIN_LATITUDE = -58;
  var MAX_LATITUDE = 84;
  var SVG_NS = "http://www.w3.org/2000/svg";

  var svg = document.getElementById("travel-map");
  var dataElement = document.getElementById("travel-map-data");

  if (!svg || !dataElement) {
    return;
  }

  var travelData;
  try {
    travelData = JSON.parse(dataElement.textContent);
  } catch (error) {
    renderMapError();
    return;
  }

  var countries = (travelData.visited_countries || []).map(normalizeCountryRecord);
  var places = travelData.places || [];
  var albums = travelData.albums || {};
  var selectedCountry = countries[0] || null;
  var countryButtons = new Map();
  var countryPaths = new Map();
  var countryLabels = new Map();

  renderCountryStrip();
  renderCities();
  updateStat("countries", countries.length);
  updateStat("places", places.length);
  setText("[data-travel-visible-count]", String(countries.length));

  fetch(svg.dataset.geojsonUrl)
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Unable to load country boundaries.");
      }
      return response.json();
    })
    .then(function (worldData) {
      renderMap(worldData);
      updateContinentStat(worldData);
      if (selectedCountry) {
        selectCountry(selectedCountry.name, false);
      }
    })
    .catch(renderMapError);

  function normalizeCountryRecord(country) {
    if (typeof country === "string") {
      return {
        accent: "#c7dce5",
        aliases: [],
        folder: slugify(country),
        map_name: country,
        name: country,
        note: "",
      };
    }

    return {
      accent: country.accent || "#c7dce5",
      aliases: country.aliases || [],
      folder: country.folder || slugify(country.name),
      map_name: country.map_name || country.name,
      name: country.name,
      note: country.note || "",
    };
  }

  function countryKeys(country) {
    return [country.name, country.map_name].concat(country.aliases || []).map(normalizeName);
  }

  function renderMap(worldData) {
    var visitedByKey = new Map();

    countries.forEach(function (country) {
      countryKeys(country).forEach(function (key) {
        visitedByKey.set(key, country);
      });
    });

    svg.textContent = "";
    svg.appendChild(createSvgElement("rect", {
      class: "travel-map__ocean",
      height: MAP_HEIGHT,
      width: MAP_WIDTH,
      x: 0,
      y: 0,
    }));

    renderGraticule(svg);

    var countryLayer = createSvgElement("g", { class: "travel-map__countries" });
    var labelLayer = createSvgElement("g", { class: "travel-map__labels" });
    svg.appendChild(countryLayer);
    svg.appendChild(labelLayer);

    (worldData.features || []).forEach(function (feature) {
      var properties = feature.properties || {};
      var country = findVisitedCountry(properties, visitedByKey);
      var pathData = geometryToPath(feature.geometry);

      if (!pathData) {
        return;
      }

      var path = createSvgElement("path", {
        class: country ? "travel-map__country is-visited" : "travel-map__country",
        d: pathData,
      });

      path.dataset.countryName = country ? country.name : properties.admin || properties.name || "";
      if (country) {
        path.style.setProperty("--country-accent", country.accent);
        path.setAttribute("role", "button");
        path.setAttribute("tabindex", "0");
        path.setAttribute("aria-label", "Open " + country.name + " travel album");
        path.addEventListener("click", function () {
          selectCountry(country.name, true);
        });
        path.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectCountry(country.name, true);
          }
        });
        countryPaths.set(country.name, path);
      }

      countryLayer.appendChild(path);
    });

    countries.forEach(function (country) {
      var path = countryPaths.get(country.name);
      if (!path) {
        return;
      }

      var center = getPathCenter(path);
      if (!center) {
        return;
      }

      var label = createCountryLabel(country, center);
      labelLayer.appendChild(label);
      countryLabels.set(country.name, label);
    });
  }

  function renderGraticule(targetSvg) {
    var graticule = createSvgElement("g", { class: "travel-map__graticule" });
    [-120, -60, 0, 60, 120].forEach(function (longitude) {
      var start = project(longitude, MIN_LATITUDE);
      var end = project(longitude, MAX_LATITUDE);
      graticule.appendChild(createSvgElement("line", {
        x1: start.x,
        x2: end.x,
        y1: start.y,
        y2: end.y,
      }));
    });
    [-30, 0, 30, 60].forEach(function (latitude) {
      var start = project(-180, latitude);
      var end = project(180, latitude);
      graticule.appendChild(createSvgElement("line", {
        x1: start.x,
        x2: end.x,
        y1: start.y,
        y2: end.y,
      }));
    });
    targetSvg.appendChild(graticule);
  }

  function createCountryLabel(country, center) {
    var group = createSvgElement("g", {
      class: "travel-map__label",
      transform: "translate(" + center.x.toFixed(2) + " " + center.y.toFixed(2) + ")",
    });
    var dot = createSvgElement("circle", { class: "travel-map__label-dot", r: 4 });
    var halo = createSvgElement("circle", { class: "travel-map__label-halo", r: 14 });
    var text = createSvgElement("text", {
      dx: 12,
      dy: 4,
    });
    text.textContent = country.name;
    group.style.setProperty("--country-accent", country.accent);
    group.appendChild(halo);
    group.appendChild(dot);
    group.appendChild(text);
    return group;
  }

  function getPathCenter(path) {
    try {
      var box = path.getBBox();
      if (box.width === 0 && box.height === 0) {
        return null;
      }
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
      };
    } catch (error) {
      return null;
    }
  }

  function findVisitedCountry(properties, visitedByKey) {
    var possibleKeys = [
      properties.admin,
      properties.name,
      properties.iso_a2,
    ].map(normalizeName);

    for (var index = 0; index < possibleKeys.length; index += 1) {
      if (visitedByKey.has(possibleKeys[index])) {
        return visitedByKey.get(possibleKeys[index]);
      }
    }
    return null;
  }

  function renderCountryStrip() {
    var strip = document.querySelector("[data-travel-country-strip]");
    if (!strip) {
      return;
    }

    countries.forEach(function (country, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "travel-country-chip";
      button.dataset.countryName = country.name;
      button.style.setProperty("--country-accent", country.accent);
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.textContent = country.name;
      button.addEventListener("click", function () {
        selectCountry(country.name, true);
      });
      strip.appendChild(button);
      countryButtons.set(country.name, button);
    });
  }

  function selectCountry(countryName, shouldScrollAlbum) {
    var country = countries.find(function (item) {
      return item.name === countryName;
    });

    if (!country) {
      return;
    }

    selectedCountry = country;
    countryButtons.forEach(function (button, name) {
      button.setAttribute("aria-pressed", name === country.name ? "true" : "false");
    });
    countryPaths.forEach(function (path, name) {
      path.classList.toggle("is-active", name === country.name);
    });
    countryLabels.forEach(function (label, name) {
      label.classList.toggle("is-active", name === country.name);
    });

    renderAlbum(country);

    if (shouldScrollAlbum) {
      var album = document.querySelector("[data-travel-album]");
      if (album) {
        album.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  function renderAlbum(country) {
    var countryPlaces = places.filter(function (place) {
      return normalizeName(place.group) === normalizeName(country.name);
    });
    var photos = albums[country.name] || [];

    setText("[data-travel-album-title]", country.name);
    setText("[data-travel-album-note]", country.note);
    setText("[data-travel-album-place-count]", pluralize(countryPlaces.length, "place"));
    setText("[data-travel-album-photo-count]", pluralize(photos.length, "photo"));
    renderAlbumPlaces(countryPlaces);
    renderPhotos(country, photos);
  }

  function renderAlbumPlaces(countryPlaces) {
    var container = document.querySelector("[data-travel-album-places]");
    if (!container) {
      return;
    }
    container.textContent = "";

    countryPlaces.slice(0, 6).forEach(function (place) {
      var item = document.createElement("span");
      item.textContent = place.map_label || place.detail || place.name;
      container.appendChild(item);
    });
  }

  function renderPhotos(country, photos) {
    var grid = document.querySelector("[data-travel-photo-grid]");
    if (!grid) {
      return;
    }
    grid.textContent = "";

    if (photos.length === 0) {
      renderPhotoPlaceholders(grid, country);
      return;
    }

    photos.slice(0, 6).forEach(function (photo, index) {
      var figure = document.createElement("figure");
      var image = document.createElement("img");
      var caption = document.createElement("figcaption");
      figure.className = index === 0 ? "travel-photo is-featured" : "travel-photo";
      image.src = photo.src;
      image.alt = formatPhotoCaption(photo.name, country.name);
      image.loading = "lazy";
      caption.textContent = formatPhotoCaption(photo.name, country.name);
      figure.appendChild(image);
      figure.appendChild(caption);
      grid.appendChild(figure);
    });
  }

  function renderPhotoPlaceholders(grid, country) {
    var initials = country.name
      .split(/\s+/)
      .map(function (word) {
        return word.charAt(0);
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();

    for (var index = 0; index < 3; index += 1) {
      var tile = document.createElement("div");
      var mark = document.createElement("span");
      var caption = document.createElement("p");
      tile.className = index === 0
        ? "travel-photo-placeholder is-featured"
        : "travel-photo-placeholder";
      tile.style.setProperty("--country-accent", country.accent);
      mark.textContent = initials;
      caption.textContent = index === 0 ? "Album awaiting photos" : country.name;
      tile.appendChild(mark);
      tile.appendChild(caption);
      grid.appendChild(tile);
    }
  }

  function renderCities() {
    var cityList = document.querySelector("[data-travel-city-list]");
    if (!cityList) {
      return;
    }

    places
      .filter(function (place) {
        return place.highlight;
      })
      .forEach(function (place, index) {
        var item = document.createElement("article");
        var number = document.createElement("span");
        var copy = document.createElement("div");
        var heading = document.createElement("h3");
        var country = document.createElement("p");
        var label = place.map_label || place.name;
        var detail = place.map_label && place.map_label !== place.name ? place.name : place.detail;

        item.className = "travel-city-item";
        number.className = "travel-city-item__number";
        number.textContent = String(index + 1).padStart(2, "0");
        heading.textContent = label;
        country.className = "travel-city-item__country";
        country.textContent = place.group || "";

        copy.appendChild(heading);
        copy.appendChild(country);
        if (detail && detail !== label) {
          var note = document.createElement("p");
          note.className = "travel-city-item__note";
          note.textContent = detail;
          copy.appendChild(note);
        }

        item.appendChild(number);
        item.appendChild(copy);
        cityList.appendChild(item);
      });
  }

  function updateContinentStat(worldData) {
    var visitedKeys = new Set();
    var continents = new Set();

    countries.forEach(function (country) {
      countryKeys(country).forEach(function (key) {
        visitedKeys.add(key);
      });
    });

    (worldData.features || []).forEach(function (feature) {
      var properties = feature.properties || {};
      var keys = [properties.admin, properties.name, properties.iso_a2].map(normalizeName);
      if (keys.some(function (key) { return visitedKeys.has(key); }) && properties.continent) {
        continents.add(properties.continent);
      }
    });

    updateStat("continents", continents.size);
  }

  function geometryToPath(geometry) {
    if (!geometry || !geometry.coordinates) {
      return "";
    }

    var polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
    return polygons.map(polygonToPath).join(" ");
  }

  function polygonToPath(polygon) {
    return polygon.map(function (ring) {
      var path = "";
      var previousX = null;

      ring.forEach(function (coordinate, index) {
        var point = project(Number(coordinate[0]), Number(coordinate[1]));
        if (previousX !== null && Math.abs(point.x - previousX) > MAP_WIDTH / 2) {
          path += "M" + point.x.toFixed(2) + "," + point.y.toFixed(2);
        } else {
          path += (index === 0 ? "M" : "L") + point.x.toFixed(2) + "," + point.y.toFixed(2);
        }
        previousX = point.x;
      });

      return path + "Z";
    }).join(" ");
  }

  function project(longitude, latitude) {
    return {
      x: ((longitude + 180) / 360) * MAP_WIDTH,
      y: ((MAX_LATITUDE - latitude) / (MAX_LATITUDE - MIN_LATITUDE)) * MAP_HEIGHT,
    };
  }

  function createSvgElement(name, attributes) {
    var element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

  function formatPhotoCaption(filename, fallback) {
    if (!filename) {
      return fallback;
    }
    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function pluralize(count, singular) {
    return count + " " + singular + (count === 1 ? "" : "s");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeName(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function updateStat(name, value) {
    setText('[data-travel-stat="' + name + '"]', String(value));
  }

  function setText(selector, value) {
    var element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  }

  function renderMapError() {
    svg.textContent = "";
    var text = createSvgElement("text", {
      class: "travel-map__error",
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT / 2,
    });
    text.textContent = "Map could not be loaded.";
    svg.appendChild(text);
  }
})();
