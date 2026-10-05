---
layout: page
title: Travel
permalink: /travel/
description:
nav: true
nav_order: 7
travel_map: true
body_class: travel-page-shell
footer_fixed: false
---

<div class="travel-page">
  <section class="travel-atlas" aria-labelledby="travel-heading">
    <header class="travel-atlas__header">
      <div>
        <p class="travel-eyebrow">Travel atlas</p>
        <h1 id="travel-heading">Places that stay with me.</h1>
        <p class="travel-lede">
          A quiet map of countries visited, with photo albums ready to grow as the archive comes together.
        </p>
      </div>

      <dl class="travel-stats" aria-label="Travel atlas summary">
        <div>
          <dt data-travel-stat="countries">--</dt>
          <dd>countries</dd>
        </div>
        <div>
          <dt data-travel-stat="places">--</dt>
          <dd>places mapped</dd>
        </div>
        <div>
          <dt data-travel-stat="continents">--</dt>
          <dd>continents</dd>
        </div>
      </dl>
    </header>

    <div class="travel-map-experience">
      <div class="travel-map-board">
        <div class="travel-map-board__topline">
          <p>Visited countries</p>
          <p><span data-travel-visible-count>--</span> illuminated</p>
        </div>

        <figure class="travel-map-frame">
          <svg
            id="travel-map"
            class="travel-map"
            viewBox="0 0 1200 640"
            role="img"
            aria-label="Minimal world map with visited countries highlighted"
            data-geojson-url="{{ '/assets/json/world-countries.geojson' | relative_url }}"
          ></svg>
          <figcaption class="travel-map-caption">
            Country boundaries from <a href="https://www.naturalearthdata.com/">Natural Earth</a>.
          </figcaption>
        </figure>
      </div>

      <aside class="travel-album-card" data-travel-album aria-live="polite">
        <div class="travel-album-card__kicker">Selected country</div>
        <h2 data-travel-album-title>United States</h2>
        <p data-travel-album-note></p>
        <div class="travel-album-card__meta">
          <span data-travel-album-place-count>-- places</span>
          <span data-travel-album-photo-count>-- photos</span>
        </div>
        <div class="travel-album-places" data-travel-album-places></div>
        <div class="travel-photo-grid" data-travel-photo-grid></div>
      </aside>
    </div>

    <div class="travel-country-strip" data-travel-country-strip aria-label="Choose a visited country"></div>
  </section>

  <section class="travel-cities" aria-labelledby="cities-heading">
    <header class="travel-section-header travel-section-header--simple">
      <div>
        <p class="travel-section-number">02</p>
        <h2 id="cities-heading">Highlighted places</h2>
      </div>
    </header>
    <div class="travel-city-list" data-travel-city-list></div>
  </section>
</div>

<script id="travel-map-data" type="application/json">
{
  "visited_countries": {{ site.data.travel.visited_countries | jsonify }},
  "places": {{ site.data.travel.places | jsonify }},
  "albums": {
    {% for country in site.data.travel.visited_countries %}
      {% assign folder_path = '/assets/img/travel/' | append: country.folder | append: '/' %}
      {{ country.name | jsonify }}: [
        {% assign first_photo = true %}
        {% for file in site.static_files %}
          {% assign ext = file.extname | downcase %}
          {% assign is_photo = false %}
          {% if ext == '.jpg' or ext == '.jpeg' or ext == '.png' or ext == '.webp' or ext == '.avif' %}
            {% assign is_photo = true %}
          {% endif %}
          {% if file.path contains folder_path and is_photo %}
            {% unless first_photo %},{% endunless %}
            {
              "src": {{ file.path | relative_url | jsonify }},
              "name": {{ file.name | jsonify }}
            }
            {% assign first_photo = false %}
          {% endif %}
        {% endfor %}
      ]{% unless forloop.last %},{% endunless %}
    {% endfor %}
  }
}
</script>
